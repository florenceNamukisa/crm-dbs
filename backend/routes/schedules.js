import express from 'express';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// Get all schedules with filters
router.get('/', async (req, res) => {
  try {
    const { 
      agentId, 
      clientId, 
      type, 
      status, 
      startDate, 
      endDate,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = {};
    
    if (agentId) query.agent = agentId;
    if (clientId) query.client = clientId;
    if (type) query.type = type;
    if (status) query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const schedules = await Schedule.find(query)
      .populate('client', 'name email phone company')
      .populate('agent', 'name email role')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Schedule.countDocuments(query);
    
    res.json({
      schedules,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get schedule by ID
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('client', 'name email phone company')
      .populate('agent', 'name email role');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new schedule
router.post('/', async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();
    
    await schedule.populate('client', 'name email phone company');
    await schedule.populate('agent', 'name email role');
    
    // Send notification if scheduled
    if (schedule.reminders && schedule.reminders.length > 0) {
      await sendNotification(schedule, 'created');
    }
    
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update schedule
router.put('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('client', 'name email phone company')
    .populate('agent', 'name email role');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    )
    .populate('client', 'name email phone company')
    .populate('agent', 'name email role');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error completing schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reschedule meeting
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { date, duration, notes } = req.body;
    
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { 
        date, 
        duration,
        status: 'scheduled',
        $push: { 
          history: {
            action: 'rescheduled',
            date: new Date(),
            notes: notes || 'Meeting rescheduled'
          }
        }
      },
      { new: true }
    )
    .populate('client', 'name email phone company')
    .populate('agent', 'name email role');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error rescheduling:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming schedules
router.get('/agent/:agentId/upcoming', async (req, res) => {
  try {
    const { agentId } = req.params;
    const today = new Date();
    
    const upcomingSchedules = await Schedule.find({
      agent: agentId,
      date: { $gte: today },
      status: 'scheduled'
    })
    .populate('client', 'name email phone company')
    .sort({ date: 1 })
    .limit(10);
    
    res.json(upcomingSchedules);
  } catch (error) {
    console.error('Error fetching upcoming schedules:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as scheduleRoutes };