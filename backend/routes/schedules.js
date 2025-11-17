import express from 'express';
import Meeting from '../models/Meeting.js';

const router = express.Router();

// Get all meetings
router.get('/', async (req, res) => {
  try {
    const { agentId } = req.query;
    const query = agentId ? { agent: agentId } : {};
    
    const meetings = await Meeting.find(query)
      .populate('client')
      .populate('agent', 'name email')
      .sort({ scheduledTime: 1 });
    
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new meeting
router.post('/', async (req, res) => {
  try {
    const meeting = new Meeting(req.body);
    await meeting.save();
    
    await meeting.populate('client');
    await meeting.populate('agent', 'name email');
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update meeting
router.put('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('client')
    .populate('agent', 'name email');
    
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete meeting
router.delete('/:id', async (req, res) => {
  try {
    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as scheduleRoutes };