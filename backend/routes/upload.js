import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

// POST - Upload a file
router.post('/', getCurrentUser, upload.single('file'), async (req, res) => {
  try {
    console.log('=== POST /api/upload ===');
    console.log('User:', req.user?.userId);
    console.log('File:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct the file URL (relative path from backend)
    const fileUrl = `/uploads/${req.file.filename}`;

    console.log('✅ File uploaded successfully:', fileUrl);

    res.status(201).json({
      message: 'File uploaded successfully',
      url: fileUrl,
      path: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// DELETE - Delete a file
router.delete('/:filename', getCurrentUser, async (req, res) => {
  try {
    console.log('=== DELETE /api/upload/:filename ===');
    console.log('User:', req.user?.userId);
    console.log('Filename:', req.params.filename);

    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    console.log('✅ File deleted successfully:', filename);

    res.json({
      message: 'File deleted successfully',
      filename
    });
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

export { router as uploadRoutes };
