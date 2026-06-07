import mongoose from 'mongoose';

const systemMetricsSchema = new mongoose.Schema({
  cpuUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  memoryUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  storageUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  storageTotal: {
    type: Number,
    default: 0
  },
  activeSessions: {
    type: Number,
    default: 0
  },
  uptime: {
    type: Number,
    default: 0
  },
  apiLatency: {
    type: Number,
    default: 0
  },
  requestCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  tenantCount: {
    type: Number,
    default: 0
  },
  userCount: {
    type: Number,
    default: 0
  },
  alertCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

systemMetricsSchema.index({ createdAt: -1 });

export default mongoose.model('SystemMetrics', systemMetricsSchema);