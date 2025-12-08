import express from 'express';
import Schedule from '../models/Schedule.js';

// Generate meeting link based on mode
const generateMeetingLink = (mode) => {
  switch (mode) {
    case 'zoom':
      // In a real app, you'd integrate with Zoom API to create a meeting
      return 'https://zoom.us/j/example-meeting-id';
    case 'google-meet':
      // In a real app, you'd use Google Calendar API to create a meeting
      return 'https://meet.google.com/example-meeting-code';
    case 'teams':
      return 'https://teams.microsoft.com/l/meetup-join/example-meeting';
    default:
      return null;
  }
};

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

// Get all schedules with filters
router.get('/', getCurrentUser, async (req, res) => {
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

    // Agents can only see their own schedules, admins see all
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    } else if (agentId) {
      // Admin can filter by specific agent
      query.agent = agentId;
    }
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
    const scheduleData = { ...req.body };

    // Generate meeting link if it's a virtual meeting
    if (scheduleData.type === 'meeting' && ['zoom', 'google-meet', 'teams'].includes(scheduleData.mode)) {
      scheduleData.meetingLink = generateMeetingLink(scheduleData.mode);
    }

    const schedule = new Schedule(scheduleData);
    await schedule.save();

    await schedule.populate('client', 'name email phone company');
    await schedule.populate('agent', 'name email role');

    // Send email invite to client if it's a meeting
    if (schedule.type === 'meeting' && schedule.client && schedule.client.email) {
      const { sendEmail } = await import('../services/emailService.js');

      const emailResult = await sendEmail(
        schedule.client.email,
        'meetingInvite',
        {
          clientName: schedule.client.name,
          agentName: schedule.agent.name,
          title: schedule.title,
          date: schedule.date,
          duration: schedule.duration,
          location: schedule.location,
          mode: schedule.mode,
          agenda: schedule.agenda,
          meetingLink: schedule.meetingLink
        }
      );

      if (emailResult.success) {
      } else {
        console.error('❌ Failed to send meeting invite:', emailResult.error);
      }
    }

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

// Client response to meeting invite
router.post('/:id/respond', async (req, res) => {
  try {
    const { response, notes } = req.body; // response: 'accepted', 'declined', 'tentative'

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    schedule.clientResponse = {
      responded: true,
      response,
      respondedAt: new Date(),
      notes
    };

    await schedule.save();

    // Create notification for the agent about client response
    const { createNotification } = await import('../utils/notifications.js');
    await createNotification({
      type: 'meeting_response',
      actorId: schedule.client._id,
      entityType: 'meeting',
      entityId: schedule._id,
      metadata: {
        response,
        meetingTitle: schedule.title,
        clientName: schedule.client?.name || 'Client'
      }
    });

    res.json({ message: 'Response recorded successfully', schedule });
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark meeting as completed and track attendance
router.put('/:id/complete', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    ).populate('client', 'name email')
     .populate('agent', 'name email');

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Create notification for completed meeting
    const { createNotification } = await import('../utils/notifications.js');
    await createNotification({
      type: 'meeting_completed',
      actorId: schedule.agent._id,
      entityType: 'meeting',
      entityId: schedule._id,
      metadata: {
        meetingTitle: schedule.title,
        clientName: schedule.client?.name || 'Client'
      }
    });

    res.json(schedule);
  } catch (error) {
    console.error('Error completing meeting:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as scheduleRoutes };