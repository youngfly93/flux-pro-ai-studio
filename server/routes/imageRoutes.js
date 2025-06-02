const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fluxService = require('../services/fluxService');

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
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Generate image from text
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🎨 Starting image generation...');
    
    // Create generation request
    const request = await fluxService.generateImage(prompt, options);
    
    if (!request.id) {
      return res.status(500).json({ error: 'Failed to create generation request' });
    }

    // Poll for result
    const result = await fluxService.pollForResult(request);
    
    if (result.status === 'Ready' && result.result?.sample) {
      // Download the image
      const imageBuffer = await fluxService.downloadImage(result.result.sample);
      
      // Save to uploads directory
      const filename = `generated-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../uploads', filename);
      fs.writeFileSync(filepath, imageBuffer);
      
      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      res.status(500).json({ error: 'Image generation failed', status: result.status });
    }
    
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit uploaded image
router.post('/edit', upload.single('image'), async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    console.log('✏️ Starting image editing...');
    
    // Convert uploaded image to base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fluxService.imageToBase64(imageBuffer);
    
    // Create edit request
    const request = await fluxService.editImage(prompt, imageBase64, options);
    
    if (!request.id) {
      return res.status(500).json({ error: 'Failed to create edit request' });
    }

    // Poll for result
    const result = await fluxService.pollForResult(request);
    
    if (result.status === 'Ready' && result.result?.sample) {
      // Download the edited image
      const editedImageBuffer = await fluxService.downloadImage(result.result.sample);
      
      // Save to uploads directory
      const filename = `edited-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../uploads', filename);
      fs.writeFileSync(filepath, editedImageBuffer);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      res.status(500).json({ error: 'Image editing failed', status: result.status });
    }
    
  } catch (error) {
    console.error('Edit error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get request status
router.get('/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await fluxService.getResult(requestId);
    res.json(result);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
