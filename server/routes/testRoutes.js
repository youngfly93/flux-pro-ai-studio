const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // 简化的文件类型检查
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    } else {
      console.error('❌ File type rejected:', file.mimetype);
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Test generate endpoint
router.post('/generate', async (req, res) => {
  try {
    console.log('🎨 Generate request:', req.body);
    res.json({
      success: true,
      message: 'Test generate endpoint - not implemented',
      imageUrl: '/uploads/test-image.jpg'
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test edit endpoint
router.post('/edit', upload.single('image'), async (req, res) => {
  try {
    console.log('✏️ Edit request received');
    console.log('📁 File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    console.log('📝 Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // 模拟处理延迟
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Test edit endpoint - file received successfully',
        imageUrl: `/uploads/${req.file.filename}`,
        originalFile: req.file.originalname
      });
    }, 1000);
    
  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint
router.get('/status/:requestId', async (req, res) => {
  try {
    res.json({
      status: 'Ready',
      message: 'Test status endpoint'
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
