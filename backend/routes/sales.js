// routes/sales.js
import express from 'express';
import Sale from '../models/Sale.js';
import Stock from '../models/Stock.js';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { createNotification } from '../utils/notifications.js';
import { tenantAuth } from '../middleware/tenantAuth.js';

const router = express.Router();

// Apply tenant-aware middleware to all routes
router.use(tenantAuth);

// Get all sales (admin sees all, agents see their own)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, paymentMethod, status, customerName, agent } = req.query;

    // Start with tenant-filtered query
    let query = req.tenantQuery;

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
router.get('/summary', async (req, res) => {
  try {
    const { period = 'daily', agent } = req.query;
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

    // Start with tenant-filtered query and add date filter
    let query = { ...req.tenantQuery, saleDate: { $gte: startDate } };

    // Agents can only see their own sales, or filter by specific agent if admin
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    } else if (agent) {
      // Admin can filter by specific agent
      query.agent = agent;
    }

    const sales = await Sale.find(query);

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.finalAmount, 0),
      cashSales: sales.filter(sale => sale.paymentMethod === 'cash').length,
      creditSales: sales.filter(sale => sale.paymentMethod === 'credit').length,
      cashAmount: sales.filter(sale => sale.paymentMethod === 'cash')
        .reduce((sum, sale) => sum + sale.finalAmount, 0),
      creditAmount: sales.filter(sale => sale.paymentMethod === 'credit')
        .reduce((sum, sale) => sum + sale.finalAmount, 0),
      pendingCredits: sales.filter(sale => sale.paymentMethod === 'credit' && sale.creditStatus !== 'paid').length
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales statistics (admin only - sees all data)
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Start with tenant-filtered query
    let query = req.tenantQuery;

    // Apply date filters if provided
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Only filter by agent if not admin
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'superadmin') {
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

    // Calculate sales by salesperson (agent) and monthly breakdown by salesperson
    const bySalespersonMap = {};
    const monthlyBySalespersonMap = {};

    sales.forEach(sale => {
      const agentId = sale.agent?._id ? String(sale.agent._id) : String(sale.agent);
      const agentName = sale.agent?.name || 'Unknown';

      if (!bySalespersonMap[agentId]) {
        bySalespersonMap[agentId] = { _id: agentId, name: agentName, total: 0, count: 0 };
      }
      bySalespersonMap[agentId].total += sale.finalAmount || 0;
      bySalespersonMap[agentId].count += 1;

      const date = new Date(sale.saleDate);
      if (!Number.isNaN(date.getTime())) {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const key = `${agentId}:${monthKey}`;

        if (!monthlyBySalespersonMap[key]) {
          monthlyBySalespersonMap[key] = { agentId, name: agentName, month, year, total: 0, count: 0 };
        }
        monthlyBySalespersonMap[key].total += sale.finalAmount || 0;
        monthlyBySalespersonMap[key].count += 1;
      }
    });

    const bySalesperson = Object.values(bySalespersonMap).sort((a, b) => (b.total || 0) - (a.total || 0));
    const monthlyBySalesperson = Object.values(monthlyBySalespersonMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

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
      monthly,
      bySalesperson,
      monthlyBySalesperson
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new sale (supports both CRM-style and inventory-style)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items, paymentMethod, client, notes, dueDate, clientName, amount, stage, type } = req.body;

    // Validate
    if (!customerName && !clientName && !client) {
      return res.status(400).json({ message: 'Customer or client name is required' });
    }

    // Create sale with tenant assignment
    const saleData = {
      agent: req.user.userId,
      tenant: req.user.tenantId,
      client: client || null,
      notes,
      saleDate: new Date()
    };

    // CRM-style fields
    if (clientName) saleData.clientName = clientName;
    else if (customerName) saleData.customerName = customerName;
    else saleData.clientName = 'Client';
    
    if (amount) saleData.amount = parseFloat(amount);
    if (stage) saleData.stage = stage;
    if (type) saleData.type = type;

    // Set probability based on stage
    const stageProb = {
      'Contacted': 10, 'Proposal': 40, 'Negotiations': 70, 'Closed (Won)': 100, 'Lost': 0
    };
    saleData.probability = stage ? (stageProb[stage] || 10) : 10;

    // Inventory-style fields (optional)
    if (items && Array.isArray(items) && items.length > 0) {
      saleData.items = items;
      saleData.paymentMethod = paymentMethod || 'cash';
      saleData.customerEmail = customerEmail;
      saleData.customerPhone = customerPhone;
      saleData.dueDate = paymentMethod === 'credit' && dueDate ? new Date(dueDate) : null;
    }

    const sale = new Sale(saleData);

    try {
      await sale.save();
    } catch (validationError) {
      console.error('Sale validation error:', validationError);
      return res.status(400).json({ 
        message: 'Failed to save sale', 
        error: validationError.message 
      });
    }

    // Update stock levels if items exist
    if (items && Array.isArray(items)) {
      for (const item of items) {
        try {
          let stockItem = await Stock.findOne({ itemName: item.itemName });
          if (stockItem) {
            await stockItem.updateStock(item.quantity, 'subtract');
          }
        } catch (error) {
          console.warn(`Could not update stock for ${item.itemName}:`, error.message);
        }
      }
    }

    // Update agent's sales metrics
    const agent = await User.findById(req.user.userId);
    if (agent) {
      agent.totalSales += 1;
      agent.totalSalesAmount += sale.finalAmount;

      // Update monthly stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlySales = await Sale.find({
        agent: req.user.userId,
        saleDate: { $gte: startOfMonth },
        status: 'completed'
      });

      agent.monthlySales = monthlySales.length;
      agent.monthlySalesAmount = monthlySales.reduce((sum, sale) => sum + sale.finalAmount, 0);

      await agent.save();
    }

    // Create notification for admins
    await createNotification({
      type: 'sale_created',
      actorId: req.user.userId,
      entityType: 'Sale',
      entityId: sale._id,
      metadata: {
        customerName: sale.customerName,
        finalAmount: sale.finalAmount,
        itemCount: items ? items.length : 0
      }
    });

    await sale.populate('agent', 'name email');
    await sale.populate('client', 'name email phone');

    res.status(201).json({
      message: 'Sale created successfully',
      sale
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    // Start with tenant-filtered query
    let query = { _id: req.params.id, ...req.tenantQuery };

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

    // Start with tenant-filtered query
    let query = { _id: req.params.id, ...req.tenantQuery };

    // Agents can only update their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const { customerName, customerEmail, customerPhone, items, notes, dueDate, stage, probability, type, clientName, amount } = req.body;

    if (customerName !== undefined) sale.customerName = customerName;
    if (customerEmail !== undefined) sale.customerEmail = customerEmail;
    if (customerPhone !== undefined) sale.customerPhone = customerPhone;
    if (items) sale.items = items;
    if (notes !== undefined) sale.notes = notes;
    if (dueDate) sale.dueDate = dueDate;
    if (stage !== undefined) sale.stage = stage;
    if (probability !== undefined) sale.probability = probability;
    if (type !== undefined) sale.type = type;
    if (clientName !== undefined) sale.clientName = clientName;
    if (amount !== undefined) sale.amount = amount;

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

    // Start with tenant-filtered query
    let query = { _id: req.params.id, ...req.tenantQuery };

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

// Delete a sale
router.delete('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id, ...req.tenantQuery };
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }
    const sale = await Sale.findOneAndDelete(query);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent sales for dashboard
router.get('/recent/list', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Start with tenant-filtered query
    let query = req.tenantQuery;

    // Agents can only see their own sales
    if (req.user.role === 'agent') {
      query.agent = req.user.userId;
    }

    const sales = await Sale.find(query)
      .populate('agent', 'name')
      .sort({ saleDate: -1 })
      .limit(parseInt(limit));

    res.json(sales);
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as salesRoutes };
