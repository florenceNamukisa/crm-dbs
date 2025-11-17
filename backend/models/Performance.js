const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    month: Number,
    year: Number
  },
  metrics: {
    dealsWon: Number,
    dealsLost: Number,
    totalValue: Number,
    clientsAcquired: Number,
    meetings: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Performance', performanceSchema);