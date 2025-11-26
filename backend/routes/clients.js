import express from 'express';
import Client from '../models/Client.js';

const router = express.Router();

// Get all clients
router.get('/', async (req, res) => {
  try {
    const { agentId, search, page = 1, limit = 10, start, end } = req.query;

    let query = {};
    if (agentId) query.agent = agentId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date filtering
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
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

// Create new client - SIMPLIFIED AND FIXED
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, nin, agent } = req.body;

    // Check required fields
    if (!name || !email || !phone || !nin || !agent) {
      return res.status(400).json({ 
        message: 'All required fields must be filled: name, email, phone, NIN, and agent'
      });
    }

    // Check for duplicate NIN
    const existingClient = await Client.findOne({ nin });
    if (existingClient) {
      return res.status(400).json({ 
        message: 'A client with this NIN already exists'
      });
    }

    // Create client with the data
    const client = new Client(req.body);
    const savedClient = await client.save();
    
    await savedClient.populate('agent', 'name email');
    
    res.status(201).json(savedClient);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A client with this NIN already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
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

export { router as clientRoutes };