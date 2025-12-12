// routes/sales.js - REBUILT FOR BULLETPROOF FUNCTIONALITY
import express from 'express';
import Sale from '../models/Sale.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to verify user is logged in
const getCurrentUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all sales (admin sees all, agents see their own)
router.get('/', getCurrentUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, paymentMethod, status, customerName, agent } = req.query;

    let query = {};

    // Agents can only see their own sales, or filter by specific agent if admin
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    } else if (agent) {
      // Admin can filter by specific agent
      query.agent = agent;
    }

    // Apply filters
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (status) {
      query.status = status;
    }

    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const sales = await Sale.find(query)
      .populate('agent', 'name email')
      .populate('client', 'name email phone')
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Sale.countDocuments(query);

    res.json({
      sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales summary (daily, weekly, monthly)
router.get('/summary/:period', getCurrentUser, async (req, res) => {
  try {
    const { period = 'daily' } = req.params;
    const now = new Date();

    let startDate;
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let query = { saleDate: { $gte: startDate } };

    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sales = await Sale.find(query);

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.finalAmount, 0),
      cashSales: sales.filter(sale => sale.paymentMethod === 'cash').length,
      creditSales: sales.filter(sale => sale.paymentMethod === 'credit').length
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales statistics (admin only - sees all data)
router.get('/stats', getCurrentUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    // Apply date filters if provided
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Only filter by agent if not admin
    if (req.user.role !== 'admin') {
      query.agent = req.user.userId;
    }

    const sales = await Sale.find(query).populate('agent', 'name');

    // Calculate monthly breakdown
    const monthlyStats = {};
    sales.forEach(sale => {
      const date = new Date(sale.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { total: 0, count: 0 };
      }
      monthlyStats[monthKey].total += sale.finalAmount || 0;
      monthlyStats[monthKey].count += 1;
    });

    // Convert to array format
    const monthly = Object.entries(monthlyStats).map(([month, data]) => ({
      month: parseInt(month.split('-')[1]),
      year: parseInt(month.split('-')[0]),
      total: data.total,
      count: data.count
    }));

    const stats = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + (sale.finalAmount || 0), 0),
      cashSales: sales.filter(sale => sale.paymentMethod === 'cash').length,
      creditSales: sales.filter(sale => sale.paymentMethod === 'credit').length,
      cashAmount: sales.filter(sale => sale.paymentMethod === 'cash')
        .reduce((sum, sale) => sum + (sale.finalAmount || 0), 0),
      creditAmount: sales.filter(sale => sale.paymentMethod === 'credit')
        .reduce((sum, sale) => sum + (sale.finalAmount || 0), 0),
      pendingCredits: sales.filter(sale => sale.paymentMethod === 'credit' && sale.creditStatus !== 'paid').length,
      monthly
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new sale
// CREATE a new sale (SIMPLIFIED AND BULLETPROOF)
router.post('/', getCurrentUser, async (req, res) => {
  try {
    console.log('=== POST /api/sales ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);

    const { customerName, customerEmail, customerPhone, items, paymentMethod, notes } = req.body;

    // VALIDATION WITH CLEAR ERROR MESSAGES
    if (!customerName || !customerName.toString().trim()) {
      console.log('❌ Validation failed: missing customerName');
      return res.status(400).json({ message: 'customerName is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ Validation failed: items must be a non-empty array');
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || !item.itemName.toString().trim()) {
        console.log(`❌ Validation failed: items[${i}].itemName is required`);
        return res.status(400).json({ message: `items[${i}].itemName is required` });
      }
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty < 1) {
        console.log(`❌ Validation failed: items[${i}].quantity must be >= 1`);
        return res.status(400).json({ message: `items[${i}].quantity must be >= 1` });
      }
      const price = Number(item.unitPrice);
      if (isNaN(price) || price < 0) {
        console.log(`❌ Validation failed: items[${i}].unitPrice must be >= 0`);
        return res.status(400).json({ message: `items[${i}].unitPrice must be >= 0` });
      }
    }

    if (!paymentMethod || !['cash', 'credit'].includes(paymentMethod)) {
      console.log('❌ Validation failed: paymentMethod must be cash or credit');
      return res.status(400).json({ message: 'paymentMethod must be cash or credit' });
    }

    console.log('✅ All validations passed');

    // NORMALIZE ITEMS: ensure all fields are numbers
    const normalizedItems = items.map(item => ({
      itemName: String(item.itemName).trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0
    }));

    console.log('Normalized items:', normalizedItems);

    // CREATE THE SALE OBJECT
    const sale = new Sale({
      customerName: customerName.toString().trim(),
      customerEmail: customerEmail ? customerEmail.toString().trim() : undefined,
      customerPhone: customerPhone ? customerPhone.toString().trim() : undefined,
      items: normalizedItems,
      paymentMethod,
      notes: notes ? notes.toString().trim() : undefined,
      agent: req.user.userId,
      saleDate: new Date()
    });

    console.log('Sale object before save:', sale);

    // SAVE TO DATABASE
    await sale.save();
    console.log('✅ Sale saved successfully:', sale._id);

    // POPULATE REFERENCES FOR RESPONSE
    await sale.populate('agent', 'name email');

    res.status(201).json({
      message: 'Sale created successfully',
      sale
    });
  } catch (error) {
    console.error('❌ Error creating sale:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get single sale
router.get('/:id', getCurrentUser, async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // Agents can only access their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sale = await Sale.findOne(query)
      .populate('agent', 'name email')
      .populate('client', 'name email phone');

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update sale (only for credit sales, agents can edit their own)
router.put('/:id', [
  getCurrentUser,
  body('customerName').optional().trim().isLength({ min: 1 }).withMessage('Customer name cannot be empty'),
  body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemName').optional().trim().isLength({ min: 1 }).withMessage('Item name is required'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('items.*.discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    let query = { _id: req.params.id };

    // Agents can only update their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Only allow editing credit sales
    if (sale.paymentMethod !== 'credit') {
      return res.status(400).json({ message: 'Only credit sales can be edited' });
    }

    const { customerName, customerEmail, customerPhone, items, notes, dueDate } = req.body;

    if (customerName) sale.customerName = customerName;
    if (customerEmail) sale.customerEmail = customerEmail;
    if (customerPhone) sale.customerPhone = customerPhone;
    if (items) sale.items = items;
    if (notes !== undefined) sale.notes = notes;
    if (dueDate) sale.dueDate = dueDate;

    await sale.save();

    await sale.populate('agent', 'name email');
    await sale.populate('client', 'name email phone');

    res.json({
      message: 'Sale updated successfully',
      sale
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record payment for credit sale
router.post('/:id/payment', [
  getCurrentUser,
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'online']).withMessage('Invalid payment method'),
  body('cardNumber').if(body('paymentMethod').equals('bank_transfer')).notEmpty().withMessage('Card/Account number is required for bank transfers'),
  body('bankName').if(body('paymentMethod').equals('bank_transfer')).notEmpty().withMessage('Bank name is required for bank transfers'),
  body('accountName').if(body('paymentMethod').equals('bank_transfer')).notEmpty().withMessage('Account holder name is required for bank transfers')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    let query = { _id: req.params.id };

    // Agents can only access their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    if (sale.paymentMethod !== 'credit') {
      return res.status(400).json({ message: 'Only credit sales can receive payments' });
    }

    const { amount, paymentMethod = 'cash', notes, paymentDate, cardNumber, bankName, accountName } = req.body;

    const paymentData = {
      amount,
      paymentMethod,
      notes,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date()
    };

    // Add bank transfer specific fields if payment method is bank_transfer
    if (paymentMethod === 'bank_transfer') {
      paymentData.cardNumber = cardNumber;
      paymentData.bankName = bankName;
      paymentData.accountName = accountName;
    }

    sale.payments.push(paymentData);

    sale.updateCreditStatus();
    await sale.save();

    res.json({
      message: 'Payment recorded successfully',
      sale
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as salesRoutes };
