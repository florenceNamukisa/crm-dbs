import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: String,
  company: String,
  position: String,
  meetingLocation: String,
  meetingTime: {
    type: Date,
    required: true
  },
  notes: String,
  status: {
    type: String,
    enum: ['lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'closed'],
    default: 'lead'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Client', clientSchema);