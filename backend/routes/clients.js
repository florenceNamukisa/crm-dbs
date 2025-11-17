import express from 'express';
import Client from '../models/Client.js';

const router = express.Router();

// Get all clients with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      agentId, 
      status, 
      priority, 
      tags, 
      search, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {};
    
    // Filter by agent
    if (agentId) query.agent = agentId;
    
    // Filter by status
    if (status) query.status = status;
    
    // Filter by priority
    if (priority) query.priority = priority;
    
    // Filter by tags
    if (tags) query.tags = { $in: tags.split(',') };
    
    // Search across multiple fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { nin: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clients = await Client.find(query)
      .populate('agent', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Client.countDocuments(query);
    
    res.json({
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('agent', 'name email');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    // Check for duplicate NIN
    const existingClient = await Client.findOne({ nin: req.body.nin });
    if (existingClient) {
      return res.status(400).json({ 
        message: 'Client with this NIN already exists',
        existingClient: existingClient._id 
      });
    }
    
    const client = new Client(req.body);
    await client.save();
    
    await client.populate('agent', 'name email');
    res.status(201).json(client);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Client with this NIN already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('agent', 'name email');
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add interaction to client
router.post('/:id/interactions', async (req, res) => {
  try {
    const { type, summary, date } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        lastContact: {
          date: date || new Date(),
          type,
          summary
        }
      },
      { new: true }
    ).populate('agent', 'name email');
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add document to client
router.post('/:id/documents', async (req, res) => {
  try {
    const { name, filePath, type } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          documents: {
            name,
            filePath,
            type,
            uploadDate: new Date()
          }
        }
      },
      { new: true }
    );
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export clients to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const clients = await Client.find().populate('agent', 'name email');
    
    const csvData = clients.map(client => ({
      Name: client.name,
      Email: client.email,
      Phone: client.phone,
      Company: client.company,
      Position: client.position,
      Status: client.status,
      Priority: client.priority,
      'Engagement Score': client.engagementScore,
      'Assigned Agent': client.agent?.name,
      'Created Date': client.createdAt.toISOString().split('T')[0]
    }));
    
    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as clientRoutes };