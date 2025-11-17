const express = require('express');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get settings (Admin only)
router.get('/', auth, authorize('Admin'), (req, res) => {
  res.json({
    companyName: 'CRM System',
    theme: 'orange',
    performanceCriteria: {
      minDeals: 10,
      targetRevenue: 50000,
      ratingThreshold: 3.5
    },
    notificationSettings: {
      emailNotifications: true,
      dealAlerts: true,
      weeklyReports: true
    }
  });
});

// Update settings (Admin only)
router.put('/', auth, authorize('Admin'), (req, res) => {
  // In a real application, you would save these to a database
  const { companyName, theme, performanceCriteria, notificationSettings } = req.body;
  
  res.json({ 
    message: 'Settings updated successfully',
    settings: {
      companyName,
      theme,
      performanceCriteria,
      notificationSettings
    }
  });
});

module.exports = router;