import express from 'express';
import Client from '../models/Client.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Middleware to get current user
const getCurrentUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all clients (admin sees all, agents see their own)
router.get('/', getCurrentUser, async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status, priority, tags, sortBy = 'createdAt', sortOrder = 'desc', agent } = req.query;

    let query = {};

    // Agents can only see their own clients, or filter by specific agent if admin
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    } else if (agent) {
      // Admin can filter by specific agent
      query.agent = agent;
    }

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const clients = await Client.find(query)
      .populate('agent', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Client.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
});

// Get client by ID
router.get('/:id', getCurrentUser, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
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
    res.status(500).json({ message: 'Error fetching client', error: error.message });
  }
});

// Create new client
router.post('/', getCurrentUser, async (req, res) => {
  try {
    const clientData = {
      ...req.body,
      agent: req.user.userId // Always use the authenticated user's ID
    };

    const client = new Client(clientData);
    try {
      await client.save();
    } catch (validationError) {
      if (validationError.name === 'ValidationError') {
        const errors = Object.values(validationError.errors).map(err => err.message);
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors
        });
      }
      if (validationError.code === 11000) { // Duplicate key error
        const field = Object.keys(validationError.keyValue)[0];
        return res.status(400).json({
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
        });
      }
      throw validationError;
    }

    const populatedClient = await Client.findById(client._id)
      .populate('agent', 'name email');

    // Create notification for admins (don't fail if notification fails)
    try {
      await createNotification({
        type: 'client_created',
        actorId: req.user.userId,
        entityType: 'Client',
        entityId: client._id,
        metadata: {
          clientName: clientData.name,
          clientEmail: clientData.email,
          clientPhone: clientData.phone
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create client notification:', notificationError.message);
      // Don't fail the client creation if notification fails
    }

    res.status(201).json(populatedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client', error: error.message });
  }
});

// Update client
router.put('/:id', getCurrentUser, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to update this client
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('agent', 'name email')
      .populate('assignedAgents', 'name email');

    res.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client', error: error.message });
  }
});

// Delete client
router.delete('/:id', getCurrentUser, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if user has permission to delete this client
    if (req.user.role === 'agent' && client.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client', error: error.message });
  }
});

// Export clients as CSV
router.get('/export/csv', getCurrentUser, async (req, res) => {
  try {
    let query = {};

    // Agents can only export their own clients
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const clients = await Client.find(query)
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });

    // Create CSV content
    const csvHeaders = [
      'Name',
      'Email',
      'Phone',
      'Company',
      'Position',
      'Industry',
      'Status',
      'Priority',
      'City',
      'State',
      'Country',
      'Created Date',
      'Agent'
    ];

    const csvRows = clients.map(client => [
      client.name,
      client.email,
      client.phone,
      client.company || '',
      client.position || '',
      client.industry || '',
      client.status,
      client.priority,
      client.city || '',
      client.state || '',
      client.country || '',
      new Date(client.createdAt).toLocaleDateString(),
      client.agent?.name || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting clients:', error);
    res.status(500).json({ message: 'Error exporting clients', error: error.message });
  }
});

export { router as clientRoutes };