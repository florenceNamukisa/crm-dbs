import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  ip: {
    type: String,
    required: true
  },
  device: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  location: {
    country: { type: String, default: '' },
    region: { type: String, default: '' },
    city: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked'],
    default: 'success'
  },
  failureReason: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

loginLogSchema.index({ user: 1, timestamp: -1 });
loginLogSchema.index({ tenant: 1, timestamp: -1 });
loginLogSchema.index({ ip: 1, timestamp: -1 });
loginLogSchema.index({ status: 1 });

export default mongoose.model('LoginLog', loginLogSchema);