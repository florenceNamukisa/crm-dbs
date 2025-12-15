import express from 'express';
import User from '../models/User.js';
import Deal from '../models/Deal.js';
import { getAgentRankings, updateAgentRating } from '../utils/ratingSystem.js';

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

// Get performance stats for agent
router.get('/agent/:agentId', getCurrentUser, async (req, res) => {
  try {
    const { agentId } = req.params;

    const deals = await Deal.find({ agent: agentId });
    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');
    const pendingDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));

    const totalValue = wonDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const successRate = deals.length > 0 ? (wonDeals.length / deals.length * 100) : 0;

    // attempt to read user's monthlyGoal if set
    const user = await User.findById(agentId).select('monthlyGoal performanceScore name email');
    const monthlyGoal = user?.monthlyGoal || null;
    const progress = monthlyGoal ? Math.round((totalValue / monthlyGoal) * 100) : null;

    const stats = {
      successfulDeals: wonDeals.length,
      failedDeals: lostDeals.length,
      pendingDeals: pendingDeals.length,
      totalDeals: deals.length,
      totalValue,
      totalRevenue: totalValue,
      successRate: successRate.toFixed(1),
      averageDealValue: wonDeals.length > 0 ? (totalValue / wonDeals.length).toFixed(2) : 0,
      monthlyGoal,
      progress
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get overall performance stats (admin)
router.get('/overall', getCurrentUser, async (req, res) => {
  try {
    // Only admins can access overall performance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const agents = await User.find({ role: 'agent' });
    const deals = await Deal.find().populate('agent');
    
    const totalSuccessful = deals.filter(d => d.stage === 'won').length;
    const totalFailed = deals.filter(d => d.stage === 'lost').length;
    const totalValue = deals.filter(d => d.stage === 'won')
      .reduce((sum, deal) => sum + (deal.value || 0), 0);
    
    const agentPerformance = agents.map(agent => {
      const agentDeals = deals.filter(d => d.agent && d.agent._id.toString() === agent._id.toString());
      const agentSuccessful = agentDeals.filter(d => d.stage === 'won').length;
      
      return {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email
        },
        totalDeals: agentDeals.length,
        successfulDeals: agentSuccessful,
        performanceScore: agent.performanceScore,
        successRate: agentDeals.length > 0 ? (agentSuccessful / agentDeals.length * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);
    
    const stats = {
      totalAgents: agents.length,
      totalDeals: deals.length,
      totalSuccessful,
      totalFailed,
      totalValue,
      overallSuccessRate: deals.length > 0 ? (totalSuccessful / deals.length * 100).toFixed(1) : 0,
      topPerformers: agentPerformance.slice(0, 5)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get agent rankings
router.get('/rankings', getCurrentUser, async (req, res) => {
  try {
    // Only admins can access rankings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const rankings = await getAgentRankings();
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Force rating recalculation (admin only)
router.post('/recalculate-ratings', async (req, res) => {
  try {
    const { calculateAgentRatings } = await import('../utils/ratingSystem.js');
    const ratings = await calculateAgentRatings();
    res.json({
      message: 'Ratings recalculated successfully',
      updatedAgents: ratings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as performanceRoutes };