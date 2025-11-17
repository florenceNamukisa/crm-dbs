import express from 'express';
import Client from '../models/Client.js';

const router = express.Router();

// Get all clients for an agent
router.get('/', async (req, res) => {
  try {
    const { agentId } = req.query;
    const query = agentId ? { agent: agentId } : {};
    
    const clients = await Client.find(query).populate('agent', 'name email');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    
    await client.populate('agent', 'name email');
    res.status(201).json(client);
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
      { new: true }
    ).populate('agent', 'name email');
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as clientRoutes };