// models/Sale.js
import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Percentage discount
  },
  totalPrice: {
    type: Number,
    min: 0
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  customerName: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  // Sales CRM fields
  clientName: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  stage: {
    type: String,
    enum: ['Contacted', 'Proposal', 'Negotiations', 'Closed (Won)', 'Lost'],
    default: 'Contacted'
  },
  type: {
    type: String,
    enum: ['New', 'Existing'],
    default: 'New'
  },
  probability: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'UGX'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit'],
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'pending'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Multi-Tenant Field
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  notes: String,
  saleDate: {
    type: Date,
    default: Date.now
  },
  // For credit sales
  dueDate: Date,
  creditStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'online'],
      default: 'cash'
    },
    cardNumber: String,
    bankName: String,
    accountName: String,
    notes: String
  }]
}, {
  timestamps: true
});

// Calculate totals before saving
saleSchema.pre('save', function(next) {
  try {
    if (this.items && Array.isArray(this.items) && this.items.length > 0) {
      let totalAmount = 0;
      let discountAmount = 0;

      this.items.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;

        const itemTotal = quantity * unitPrice;
        const itemDiscount = itemTotal * (discount / 100);

        item.totalPrice = itemTotal - itemDiscount;

        totalAmount += itemTotal;
        discountAmount += itemDiscount;
      });

      this.totalAmount = totalAmount;
      this.discountAmount = discountAmount;
      this.finalAmount = totalAmount - discountAmount;
      
      // If no explicit amount set, use finalAmount
      if (!this.amount || this.amount === 0) {
        this.amount = this.finalAmount;
      }
    }
    
    // If items not provided but amount is set, use amount
    if ((!this.items || this.items.length === 0) && this.amount) {
      this.finalAmount = this.amount;
    }

    next();
  } catch (error) {
    console.error('Error in sale pre-save hook:', error);
    next(error);
  }
});

// Update credit status based on payments
saleSchema.methods.updateCreditStatus = function() {
  if (this.paymentMethod !== 'credit') return;

  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (totalPaid === 0) {
    this.creditStatus = 'unpaid';
  } else if (totalPaid >= this.finalAmount) {
    this.creditStatus = 'paid';
  } else {
    this.creditStatus = 'partial';
  }
};

export default mongoose.model('Sale', saleSchema);