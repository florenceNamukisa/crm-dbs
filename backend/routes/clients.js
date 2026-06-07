import express from 'express';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';
import Client from '../models/Client.js';
import { body, validationResult, query } from 'express-validator';
import { tenantAuth } from '../middleware/tenantAuth.js';
import { logAction } from '../utils/auditLog.js';
import { sendEmail } from '../services/emailService.js';

const { AccessToken, VoiceGrant } = twilio.jwt;

const router = express.Router();

// Get Twilio Voice token for in-app calling (no client required, just auth)
router.post('/call/token', tenantAuth, async (req, res) => {
  try {
    const { identity } = req.body;
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY_SID) {
      return res.status(500).json({ message: 'Twilio not configured' });
    }

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN,
      { identity: identity || `user_${req.user.userId}` }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);
    
    res.json({ token: token.toJwt() });
  } catch (error) {
    console.error('Twilio token error:', error);
    res.status(500).json({ message: 'Failed to generate token', error: error.message });
  }
});

// Apply tenant-aware middleware to all routes
router.use(tenantAuth);

// Get all clients with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, agent } = req.query;

    // Start with tenant-filtered query
    let query = req.tenantQuery;

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply status filter
    if (status) {
      query.status = status;
    }

    // Apply agent filter (admin can filter by agent, agents see only their clients or unassigned leads)
    if (req.user.role === 'agent') {
      if (status === 'prospect') {
        // For prospects, agents can see their assigned leads OR unassigned leads
        const agentConditions = [
          { agent: req.user.userId },
          { agent: { $exists: false } },
          { agent: null }
        ];
        if (search) {
          query.$and = [
            { $or: agentConditions },
            { $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
              { company: { $regex: search, $options: 'i' } }
            ]}
          ];
        } else {
          query.$or = agentConditions;
        }
      } else {
        query.agent = req.user.userId;
      }
    } else if (agent) {
      query.agent = agent;
    }

    const skip = (page - 1) * limit;

    const clients = await Client.find(query)
      .populate('agent', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Client.countDocuments(query);

    res.json({
      clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get client by ID
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery })
      .populate('agent', 'name email')
      .populate('assignedAgents', 'name email')
      .populate('deals', 'title value stage')
      .populate('interactions.createdBy', 'name')
      .populate('tasks.assignedTo', 'name');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to view this client
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new client
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Phone is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check usage limits
    if (!req.canAddClients()) {
      return res.status(403).json({ 
        message: 'Client limit reached for your subscription plan',
        limit: req.tenant.subscription?.features?.maxClients || 0
      });
    }

    const clientData = {
      ...req.body,
      tenant: req.user.tenantId,
      agent: req.user.role === 'agent' ? req.user.userId : req.body.agent
    };

    const client = new Client(clientData);
    await client.save();

    // Update tenant usage
    await req.updateTenantUsage('clients', 1);

    await logAction(req, 'CREATE_CLIENT', `Created client ${clientData.name}`, { entityType: 'Client', entityId: client._id });

    const populatedClient = await Client.findById(client._id)
      .populate('agent', 'name email');

    res.status(201).json(populatedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Client with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update client
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().isLength({ min: 1 }).withMessage('Phone cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to update this client
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedClient = await Client.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantQuery },
      req.body,
      { new: true }
    ).populate('agent', 'name email');

    await logAction(req, 'UPDATE_CLIENT', `Updated client ${client.name}`, { entityType: 'Client', entityId: client._id });
    res.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Client with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to delete this client
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Client.findOneAndDelete({ _id: req.params.id, ...req.tenantQuery });
    await req.updateTenantUsage('clients', -1);
    await logAction(req, 'DELETE_CLIENT', `Deleted client ${client.name}`, { entityType: 'Client', entityId: client._id });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add interaction to client
router.post('/:id/interactions', [
  body('type').isIn(['call', 'email', 'meeting', 'ticket', 'other']).withMessage('Invalid interaction type'),
  body('notes').trim().isLength({ min: 1 }).withMessage('Notes are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

// Agents can add interactions to their assigned clients or unassigned leads
    // Admin/managers can add to any client in tenant
    if (req.user.role === 'agent') {
      const isOwner = !client.agent || 
                      client.agent?.toString() === req.user.userId || 
                      client.assignedAgents?.some(a => a.toString() === req.user.userId);
      // Allow if agent is owner OR if it's a prospect (unassigned lead)
      const isProspect = client.status === 'prospect';
      if (!isOwner && !isProspect) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const interaction = {
      type: req.body.type,
      notes: req.body.notes,
      date: new Date(),
      createdBy: req.user.userId
    };

    client.interactions.push(interaction);
    await client.save();

    const updatedClient = await Client.findById(client._id)
      .populate('interactions.createdBy', 'name');

    res.json(updatedClient);
  } catch (error) {
    console.error('Error adding interaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add task to client
router.post('/:id/tasks', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to add tasks
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const task = {
      title: req.body.title,
      description: req.body.description || '',
      dueDate: new Date(req.body.dueDate),
      dueTime: req.body.dueTime || '',
      assignedTo: req.body.assignedTo || req.user.userId,
      completed: false
    };

    client.tasks.push(task);
    await client.save();

    const updatedClient = await Client.findById(client._id)
      .populate('tasks.assignedTo', 'name');

    res.json(updatedClient);
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send email to client
router.post('/:id/send-email', [
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await Client.findOne({ _id: req.params.id, ...req.tenantQuery });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    if (!client.email) {
      return res.status(400).json({ message: 'Client has no email address' });
    }

    const { subject, message } = req.body;

    const result = await sendEmail(client.email, 'clientEmail', {
      clientName: client.name,
      agentName: req.user.name,
      subject,
      message
    });

    if (!result.success) {
      return res.status(500).json({ message: 'Failed to send email', error: result.error });
    }

    // Log the action
    await logAction(req, 'OTHER', `Sent email to client ${client.name}`, { entityType: 'Client', entityId: client._id });

    // Add interaction record
    client.interactions.push({
      type: 'email',
      notes: `Email sent: ${subject}`,
      date: new Date(),
      createdBy: req.user.userId
    });
    await client.save();

    res.json({ message: 'Email sent successfully', messageId: result.messageId });
  } catch (error) {
    console.error('Error sending email to client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export clients as PDF
router.get('/export/pdf', async (req, res) => {
  try {
    // Build query with tenant filter
    const clientQuery = { ...req.tenantQuery };

    if (req.query.search) {
      clientQuery.$or = [
        { name:    { $regex: req.query.search, $options: 'i' } },
        { email:   { $regex: req.query.search, $options: 'i' } },
        { phone:   { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.status)  clientQuery.status = req.query.status;
    if (req.user.role === 'agent') {
      clientQuery.agent = req.user.userId;
    } else if (req.query.agent) {
      clientQuery.agent = req.query.agent;
    }

    const clients = await Client.find(clientQuery)
      .populate('agent', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // ── PDF generation ────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    doc.pipe(res);

    // ── Colour palette ────────────────────────────────────────────────────────
    const ORANGE  = '#f97316';
    const DARK    = '#1f2937';
    const MUTED   = '#6b7280';
    const LIGHT   = '#f3f4f6';
    const WHITE   = '#ffffff';
    const PAGE_W  = doc.page.width  - 80; // usable width (margin 40 each side)
    const PAGE_H  = doc.page.height;

    // ── Header banner ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(ORANGE);
    doc.fillColor(WHITE).fontSize(20).font('Helvetica-Bold')
       .text('Client Report', 40, 22);
    doc.fontSize(9).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString()}  |  Total: ${clients.length} client(s)`,
             40, 48);

    // Active filters line
    const filterParts = [];
    if (req.query.search)  filterParts.push(`Search: "${req.query.search}"`);
    if (req.query.status)  filterParts.push(`Status: ${req.query.status}`);
    if (req.user.role === 'agent') filterParts.push('Showing: Your clients only');
    if (filterParts.length) {
      doc.text(`Filters — ${filterParts.join('  |  ')}`, 40, 58);
    }

    doc.moveDown(3);

    // ── Column definitions ────────────────────────────────────────────────────
    const cols = [
      { label: '#',        width: 24  },
      { label: 'Name',     width: 120 },
      { label: 'Email',    width: 130 },
      { label: 'Phone',    width: 80  },
      { label: 'Company',  width: 90  },
      { label: 'Status',   width: 55  },
      { label: 'Priority', width: 50  },
      { label: 'Agent',    width: 80  },
    ];
    const ROW_H   = 18;
    const HEAD_H  = 22;

    const drawTableHeader = (y) => {
      doc.rect(40, y, PAGE_W, HEAD_H).fill(DARK);
      let x = 40;
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold');
      cols.forEach(col => {
        doc.text(col.label, x + 3, y + 6, { width: col.width - 6, ellipsis: true });
        x += col.width;
      });
      return y + HEAD_H;
    };

    const drawRow = (client, index, y) => {
      // Alternating row background
      if (index % 2 === 0) doc.rect(40, y, PAGE_W, ROW_H).fill(LIGHT);

      let x = 40;
      doc.fillColor(DARK).fontSize(7.5).font('Helvetica');

      const cells = [
        String(index + 1),
        client.name        || '—',
        client.email       || '—',
        client.phone       || '—',
        client.company     || '—',
        (client.status     || '—').toUpperCase(),
        (client.priority   || '—').toUpperCase(),
        client.agent?.name || 'Unassigned',
      ];

      cells.forEach((cell, i) => {
        doc.text(cell, x + 3, y + 5, { width: cols[i].width - 6, ellipsis: true });
        x += cols[i].width;
      });

      return y + ROW_H;
    };

    // ── Render table ──────────────────────────────────────────────────────────
    let y = drawTableHeader(doc.y);

    clients.forEach((client, i) => {
      // New page if we're running out of space (leave 60px for footer)
      if (y + ROW_H > PAGE_H - 60) {
        doc.addPage();
        // Re-draw header on new page
        doc.rect(0, 0, doc.page.width, 30).fill(ORANGE);
        doc.fillColor(WHITE).fontSize(9).font('Helvetica')
           .text('Client Report (continued)', 40, 10);
        y = drawTableHeader(40);
      }
      y = drawRow(client, i, y);
    });

    // ── Footer on every page ──────────────────────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.rect(0, PAGE_H - 30, doc.page.width, 30).fill(DARK);
      doc.fillColor(WHITE).fontSize(8).font('Helvetica')
         .text(
           `Page ${i + 1} of ${totalPages}  |  CRM System  |  Confidential`,
           40, PAGE_H - 18,
           { align: 'center', width: PAGE_W }
         );
    }

    doc.end();

    // Log the export action (non-blocking)
    logAction(req, 'EXPORT_DATA', `Exported ${clients.length} clients to PDF`, {
      entityType: 'Client',
      metadata: { count: clients.length, format: 'pdf' }
    });

  } catch (error) {
    console.error('Error exporting clients to PDF:', error);
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
  }
});

export { router as clientRoutes };
