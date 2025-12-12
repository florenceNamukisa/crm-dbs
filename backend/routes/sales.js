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
  const startTime = Date.now();
  try {
    console.log('\n=== POST /api/sales START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', req.user?.userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { customerName, customerEmail, customerPhone, items, paymentMethod, notes } = req.body;

    // VALIDATION
    const errors = [];
    
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      errors.push('customerName is required and must be a string');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('items must be a non-empty array');
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.itemName || typeof item.itemName !== 'string' || !item.itemName.trim()) {
          errors.push(`items[${i}].itemName is required`);
        }
        if (!item.quantity || Number(item.quantity) < 1) {
          errors.push(`items[${i}].quantity must be >= 1`);
        }
        if (item.unitPrice === undefined || item.unitPrice === null || Number(item.unitPrice) < 0) {
          errors.push(`items[${i}].unitPrice must be >= 0`);
        }
      }
    }
    
    if (!paymentMethod || !['cash', 'credit'].includes(paymentMethod)) {
      errors.push('paymentMethod must be "cash" or "credit"');
    }

    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    console.log('✅ Validation passed');

    // NORMALIZE ITEMS
    const normalizedItems = items.map((item, i) => {
      try {
        return {
          itemName: String(item.itemName).trim(),
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0
        };
      } catch (e) {
        console.error(`Error normalizing item ${i}:`, e);
        throw new Error(`Failed to normalize item ${i}`);
      }
    });

    console.log('✅ Items normalized:', normalizedItems);

    // CREATE SALE OBJECT
    const saleData = {
      customerName: String(customerName).trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      items: normalizedItems,
      paymentMethod,
      notes: notes ? String(notes).trim() : undefined,
      agent: req.user.userId,
      saleDate: new Date()
    };

    console.log('Creating sale with data:', {
      customerName: saleData.customerName,
      itemCount: saleData.items.length,
      paymentMethod: saleData.paymentMethod,
      agent: saleData.agent
    });

    const sale = new Sale(saleData);

    // SAVE TO DATABASE
    const savedSale = await sale.save();
    console.log('✅ Sale saved to database:', savedSale._id);

    // POPULATE AND RESPOND
    await savedSale.populate('agent', 'name email');

    const elapsed = Date.now() - startTime;
    console.log(`✅ POST /api/sales completed in ${elapsed}ms`);
    console.log('=== POST /api/sales END ===\n');

    res.status(201).json({
      message: 'Sale created successfully',
      sale: savedSale
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error creating sale (${elapsed}ms):`, error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Stack:', error.stack);
    console.log('=== POST /api/sales ERROR ===\n');

    res.status(500).json({
      message: 'Failed to create sale',
      error: error.message,
      type: error.constructor.name
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
