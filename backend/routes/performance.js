import express from 'express';
import User from '../models/User.js';
import Deal from '../models/Deal.js';

const router = express.Router();

// Get performance stats for agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const deals = await Deal.find({ agent: agentId });
    const successfulDeals = deals.filter(d => d.status === 'successful');
    const failedDeals = deals.filter(d => d.status === 'failed');
    
    const totalValue = successfulDeals.reduce((sum, deal) => sum + deal.value, 0);
    const successRate = deals.length > 0 ? (successfulDeals.length / deals.length * 100) : 0;
    
    const stats = {
      successfulDeals: successfulDeals.length,
      failedDeals: failedDeals.length,
      totalDeals: deals.length,
      totalValue,
      successRate: successRate.toFixed(1),
      averageDealValue: successfulDeals.length > 0 ? (totalValue / successfulDeals.length).toFixed(2) : 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get overall performance stats (admin)
router.get('/overall', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' });
    const deals = await Deal.find().populate('agent');
    
    const totalSuccessful = deals.filter(d => d.status === 'successful').length;
    const totalFailed = deals.filter(d => d.status === 'failed').length;
    const totalValue = deals.filter(d => d.status === 'successful')
      .reduce((sum, deal) => sum + deal.value, 0);
    
    const agentPerformance = agents.map(agent => {
      const agentDeals = deals.filter(d => d.agent._id.toString() === agent._id.toString());
      const agentSuccessful = agentDeals.filter(d => d.status === 'successful').length;
      
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

export { router as performanceRoutes };