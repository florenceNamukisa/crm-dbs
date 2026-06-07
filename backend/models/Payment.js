import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  method: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'paypal', 'stripe', 'flutterwave', 'mobile_money', 'cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending'
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processedAt: {
    type: Date,
    default: null
  },
  metadata: {
    cardLastFour: String,
    cardBrand: String,
    gateway: String,
    gatewayTransactionId: String,
    refundReason: String,
    disputeReason: String
  }
}, {
  timestamps: true
});

paymentSchema.index({ tenant: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ processedAt: -1 });

export default mongoose.model('Payment', paymentSchema);