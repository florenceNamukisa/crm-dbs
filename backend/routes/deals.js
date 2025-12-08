// routes/deals.js
import express from 'express';
import Deal from '../models/Deal.js';
import { body, validationResult } from 'express-validator';
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

// Get all deals (admin sees all, agents see their own)
router.get('/', getCurrentUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, stage, client, agent } = req.query;

    let query = {};

    // Agents can only see their own deals, or filter by specific agent if admin
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    } else if (agent) {
      // Admin can filter by specific agent
      query.agent = agent;
    }

    // Apply filters
    if (stage) {
      query.stage = stage;
    }

    if (client) {
      query.client = client;
    }

    const skip = (page - 1) * limit;

    const deals = await Deal.find(query)
      .populate('client', 'name email phone')
      .populate('agent', 'name email')
      .populate('teamMembers', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Deal.countDocuments(query);

    res.json({
      deals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get deal statistics
router.get('/stats', getCurrentUser, async (req, res) => {
  try {
    let query = {};

    // Agents can only see stats for their own deals
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const deals = await Deal.find(query);

    const totalDeals = deals.length;
    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');
    const pendingDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));

    const totalValue = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const averageDealValue = wonDeals.length > 0 ? totalValue / wonDeals.length : 0;

    // Calculate success rate
    const successRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

    // Get deals by stage
    const dealsByStage = {
      lead: deals.filter(d => d.stage === 'lead').length,
      qualification: deals.filter(d => d.stage === 'qualification').length,
      proposal: deals.filter(d => d.stage === 'proposal').length,
      negotiation: deals.filter(d => d.stage === 'negotiation').length,
      won: wonDeals.length,
      lost: lostDeals.length
    };

    res.json({
      totalStats: {
        totalDeals,
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
        pendingCount: pendingDeals.length,
        totalValue,
        averageDealValue,
        successRate: successRate.toFixed(1)
      },
      dealsByStage
    });
  } catch (error) {
    console.error('Error fetching deal stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get deal by ID
router.get('/:id', getCurrentUser, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('agent', 'name email')
      .populate('teamMembers', 'name email')
      .populate('notes.createdBy', 'name')
      .populate('documents.uploadedBy', 'name')
      .populate('tasks.assignedTo', 'name')
      .populate('activities.createdBy', 'name');

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if user has permission to view this deal
    if (req.user.role === 'agent' && deal.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new deal
router.post('/', getCurrentUser, [
  body('title').notEmpty().withMessage('Title is required'),
  body('value').isNumeric().withMessage('Value must be a number'),
  body('client').notEmpty().withMessage('Client is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dealData = {
      ...req.body,
      agent: req.user.role === 'agent' ? req.user.userId : req.body.agent
    };

    const deal = new Deal(dealData);
    await deal.save();

    const populatedDeal = await Deal.findById(deal._id)
      .populate('client', 'name email phone')
      .populate('agent', 'name email');

    // Create notification for admins
    await createNotification({
      type: 'deal_created',
      actorId: req.user.userId,
      entityType: 'Deal',
      entityId: deal._id,
      metadata: {
        dealTitle: dealData.title,
        dealValue: dealData.value,
        clientName: dealData.client?.name || 'Unknown Client'
      }
    });

    res.status(201).json(populatedDeal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update deal
router.put('/:id', getCurrentUser, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if user has permission to update this deal
    if (req.user.role === 'agent' && deal.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If closing the deal, set closedAt date
    if (req.body.stage && ['won', 'lost'].includes(req.body.stage) && !deal.closedAt) {
      req.body.closedAt = new Date();
    }

    const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('client', 'name email phone')
      .populate('agent', 'name email')
      .populate('teamMembers', 'name email');

    res.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update deal status
router.patch('/:id/status', getCurrentUser, async (req, res) => {
  try {
    const { status } = req.body;

    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if user has permission to update this deal
    if (req.user.role === 'agent' && deal.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = { stage: status };

    // If closing the deal, set closedAt date
    if (['won', 'lost'].includes(status) && !deal.closedAt) {
      updateData.closedAt = new Date();
    }

    const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('client', 'name email phone')
      .populate('agent', 'name email');

    res.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete deal
router.delete('/:id', getCurrentUser, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if user has permission to delete this deal
    if (req.user.role === 'agent' && deal.agent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Deal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as dealRoutes };
