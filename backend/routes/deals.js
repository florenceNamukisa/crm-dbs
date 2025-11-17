import express from 'express';
import Deal from '../models/Deal.js';

const router = express.Router();

// Get all deals
router.get('/', async (req, res) => {
  try {
    const { agentId } = req.query;
    const query = agentId ? { agent: agentId } : {};
    
    const deals = await Deal.find(query)
      .populate('client')
      .populate('agent', 'name email');
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const deal = new Deal(req.body);
    await deal.save();
    
    await deal.populate('client');
    await deal.populate('agent', 'name email');
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('client')
    .populate('agent', 'name email');
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete deal
router.delete('/:id', async (req, res) => {
  try {
    await Deal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as dealRoutes };