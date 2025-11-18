import express from 'express';
import Deal from '../models/Deal.js';

const router = express.Router();

// GET /api/sales?agent=agentId
router.get('/', async (req, res) => {
  try {
    const { agent } = req.query;

    const match = { stage: 'won' };
    if (agent) match.agent = agent;

    // total sales
    const totalAgg = await Deal.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const totalSales = totalAgg[0]?.total || 0;

    // monthly sales (by month number 1..12)
    const monthlyAgg = await Deal.aggregate([
      { $match: match },
      { $project: { value: 1, month: { $month: { $ifNull: ['$closedAt', '$createdAt'] } } } },
      { $group: { _id: '$month', total: { $sum: '$value' } } },
      { $sort: { _id: 1 } }
    ]);

    // map to months array
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
    monthlyAgg.forEach(m => {
      const idx = (m._id || 1) - 1;
      if (idx >= 0 && idx < 12) months[idx].total = m.total;
    });

    // top deals
    const topDeals = await Deal.find(match).sort({ value: -1 }).limit(5).populate('client', 'name').populate('agent', 'name');

    res.json({ totalSales, monthly: months, topDeals });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as salesRoutes };