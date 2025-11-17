import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  value: {
    type: Number,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed', 'closed'],
    default: 'pending'
  },
  closedAt: Date,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update agent performance when deal is saved
dealSchema.post('save', async function() {
  const User = mongoose.model('User');
  const agent = await User.findById(this.agent);
  
  if (this.status === 'successful') {
    agent.successfulDeals += 1;
    agent.performanceScore += 10;
  } else if (this.status === 'failed') {
    agent.failedDeals += 1;
    agent.performanceScore = Math.max(0, agent.performanceScore - 5);
  }
  
  agent.totalDeals = agent.successfulDeals + agent.failedDeals;
  await agent.save();
});

export default mongoose.model('Deal', dealSchema);