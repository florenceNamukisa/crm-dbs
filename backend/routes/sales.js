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

// GET sales statistics (simplified)
router.get('/stats/summary', getCurrentUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (req.user.role !== 'admin') {
      query.agent = req.user.userId;
    }

    const sales = await Sale.find(query);

    const stats = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + (sale.finalAmount || 0), 0),
      cashSales: sales.filter(sale => sale.paymentMethod === 'cash').length,
      creditSales: sales.filter(sale => sale.paymentMethod === 'credit').length
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

    console.log('Sale object before save:', {
      customerName: sale.customerName,
      items: sale.items,
      paymentMethod: sale.paymentMethod,
      agent: sale.agent
    });

    // SAVE TO DATABASE
    try {
      await sale.save();
      console.log('✅ Sale saved successfully:', sale._id);
    } catch (saveError) {
      console.error('❌ Error saving sale to database:', saveError);
      console.error('Error message:', saveError.message);
      console.error('Error details:', saveError);
      throw saveError;
    }

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
router.put('/:id', getCurrentUser, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items, notes, dueDate } = req.body;

    let query = { _id: req.params.id };

    // Agents can only update their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    if (customerName) sale.customerName = customerName;
    if (customerEmail) sale.customerEmail = customerEmail;
    if (customerPhone) sale.customerPhone = customerPhone;
    if (items) sale.items = items;
    if (notes !== undefined) sale.notes = notes;
    if (dueDate) sale.dueDate = dueDate;

    await sale.save();
    await sale.populate('agent', 'name email');

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
router.post('/:id/payment', getCurrentUser, async (req, res) => {
  try {
    const { amount, paymentMethod = 'cash', notes, paymentDate } = req.body;

    let query = { _id: req.params.id };

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

    const paymentData = {
      amount: Number(amount) || 0,
      paymentMethod,
      notes,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date()
    };

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
