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
    required: true,
    min: 0
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
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
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    // Bank transfer specific fields
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
    let totalAmount = 0;
    let discountAmount = 0;

    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
      return next(new Error('At least one item is required'));
    }

    this.items.forEach(item => {
      // Ensure all required fields are present and valid
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;

      if (quantity <= 0 || unitPrice < 0) {
        return next(new Error('Invalid item data'));
      }

      const itemTotal = quantity * unitPrice;
      const itemDiscount = itemTotal * (discount / 100);

      // Store calculated total price on the item
      item.totalPrice = itemTotal - itemDiscount;

      totalAmount += itemTotal;
      discountAmount += itemDiscount;
    });

    // Set the calculated totals
    this.totalAmount = totalAmount;
    this.discountAmount = discountAmount;
    this.finalAmount = totalAmount - discountAmount;

    console.log('Calculated totals:', { totalAmount, discountAmount, finalAmount: this.finalAmount });

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
