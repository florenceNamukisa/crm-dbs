// routes/deals.js
import express from 'express';
import Deal from '../models/Deal.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads/deals';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, PNG, and TXT files are allowed.'));
    }
  }
});

// Get all deals with filtering and search
router.get('/', async (req, res) => {
  try {
    const { 
      agentId, 
      clientId, 
      stage, 
      search, 
      minValue, 
      maxValue,
      probability 
    } = req.query;
    
    let query = {};
    
    if (agentId) query.agent = agentId;
    if (clientId) query.client = clientId;
    if (stage) query.stage = stage;
    if (probability) query.probability = { $gte: parseInt(probability) };
    
    if (minValue || maxValue) {
      query.value = {};
      if (minValue) query.value.$gte = parseInt(minValue);
      if (maxValue) query.value.$lte = parseInt(maxValue);
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const deals = await Deal.find(query)
      .populate('client', 'name email companyName phone')
      .populate('agent', 'name email avatar')
      .populate('teamMembers', 'name email avatar')
      .populate('notes.createdBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('tasks.assignedTo', 'name email')
      .populate('activities.createdBy', 'name email')
      .sort({ lastActivityDate: -1 });
    
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload document to deal
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const document = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      url: `/api/deals/${deal._id}/documents/${req.file.filename}`,
      uploadedBy: req.body.uploadedBy
    };

    deal.documents.push(document);
    
    // Add activity for document upload
    deal.activities.push({
      type: 'document_upload',
      description: `Uploaded document: ${req.file.originalname}`,
      createdBy: req.body.uploadedBy
    });

    await deal.save();
    
    await deal.populate('documents.uploadedBy', 'name email');
    res.json(deal.documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Serve uploaded documents
router.get('/:id/documents/:filename', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const document = deal.documents.find(doc => doc.filename === req.params.filename);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(uploadsDir, document.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete document from deal
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const documentIndex = deal.documents.findIndex(doc => doc._id.toString() === req.params.docId);
    if (documentIndex === -1) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = deal.documents[documentIndex];
    
    // Delete file from filesystem
    const filePath = path.join(uploadsDir, document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    deal.documents.splice(documentIndex, 1);
    await deal.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const { title, description, value, client, agent, stage, probability, expectedCloseDate } = req.body;

    if (!title || !value || !client || !agent) {
      return res.status(400).json({
        message: 'Missing required fields: title, value, client, agent'
      });
    }

    const deal = new Deal({
      title,
      description,
      value,
      client,
      agent,
      stage: stage || 'lead',
      probability: probability || 0,
      expectedCloseDate
    });

    const savedDeal = await deal.save();
    await savedDeal.populate('client', 'name email');
    await savedDeal.populate('agent', 'name email');

    res.status(201).json(savedDeal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get deal statistics
router.get('/stats', async (req, res) => {
  try {
    const stageStats = await Deal.aggregate([
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgProbability: { $avg: '$probability' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalDeals = await Deal.countDocuments();
    const totalValue = await Deal.aggregate([
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const wonValue = await Deal.aggregate([
      { $match: { stage: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const lostValue = await Deal.aggregate([
      { $match: { stage: 'lost' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    res.json({
      stageStats,
      totalStats: {
        totalDeals,
        totalValue: totalValue[0]?.total || 0,
        wonValue: wonValue[0]?.total || 0,
        lostValue: lostValue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single deal by ID
router.get('/:id', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('client', 'name email')
      .populate('agent', 'name email avatar')
      .populate('teamMembers', 'name email avatar')
      .populate('notes.createdBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('tasks.assignedTo', 'name email')
      .populate('activities.createdBy', 'name email');

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('client', 'name email')
     .populate('agent', 'name email avatar')
     .populate('teamMembers', 'name email avatar');

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete deal
router.delete('/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as dealRoutes };