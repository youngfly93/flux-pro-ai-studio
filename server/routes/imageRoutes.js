const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const fluxService = require('../services/fluxService');
const stabilityService = require('../services/stabilityService');

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

    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimes = /image\/(jpeg|jpg|png|gif|webp)/;

    // 对于从 canvas 生成的文件，可能没有 originalname
    const extname = file.originalname ?
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const mimetype = allowedMimes.test(file.mimetype);

    console.log('📋 File validation:', { extname, mimetype });

    if (mimetype || file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      return cb(null, true);
    } else {
      console.error('❌ File type rejected:', file.mimetype);
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
    const { prompt, options = {}, mask } = req.body;

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

    // Parse options if it's a string
    let parsedOptions = options;
    if (typeof options === 'string') {
      try {
        parsedOptions = JSON.parse(options);
      } catch (e) {
        parsedOptions = {};
      }
    }

    // If mask is provided, add it to options for inpainting
    if (mask) {
      // Convert mask data URL to base64
      const maskBase64 = mask.replace(/^data:image\/[a-z]+;base64,/, '');
      parsedOptions.mask = maskBase64;
      console.log('🎭 Using mask for inpainting');
    }

    // Create edit request
    const request = await fluxService.editImage(prompt, imageBase64, parsedOptions);

    if (!request.id) {
      return res.status(500).json({ error: 'Failed to create edit request' });
    }

    // Poll for result
    const result = await fluxService.pollForResult(request);

    if (result.status === 'Ready' && result.result?.sample) {
      // Download the edited image
      const editedImageBuffer = await fluxService.downloadImage(result.result.sample);

      // Save to uploads directory
      const filename = `${mask ? 'inpainted' : 'edited'}-${Date.now()}.jpg`;
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

// Expand uploaded image
router.post('/expand', upload.single('image'), async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    console.log('🔄 Starting image expansion...');

    // Convert uploaded image to base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fluxService.imageToBase64(imageBuffer);

    // Parse options if it's a string
    let parsedOptions = options;
    if (typeof options === 'string') {
      try {
        parsedOptions = JSON.parse(options);
      } catch (e) {
        parsedOptions = {};
      }
    }

    console.log('📐 Expansion options:', parsedOptions);

    // Create expand request
    const request = await fluxService.expandImage(imageBase64, prompt, parsedOptions);

    if (!request.id) {
      return res.status(500).json({ error: 'Failed to create expand request' });
    }

    // Poll for result
    const result = await fluxService.pollForResult(request);

    if (result.status === 'Ready' && result.result?.sample) {
      // Download the expanded image
      const expandedImageBuffer = await fluxService.downloadImage(result.result.sample);

      // Save to uploads directory
      const filename = `expanded-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../uploads', filename);
      fs.writeFileSync(filepath, expandedImageBuffer);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      res.status(500).json({ error: 'Image expansion failed', status: result.status });
    }

  } catch (error) {
    console.error('Expand error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Upscale uploaded image using Stability AI
router.post('/upscale', upload.single('image'), async (req, res) => {
  try {
    const { type = 'conservative', prompt, creativity, output_format = 'png' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    console.log('🔍 Starting image upscaling...', {
      type,
      hasPrompt: !!prompt,
      creativity,
      output_format
    });

    // Read uploaded image
    const imageBuffer = fs.readFileSync(req.file.path);

    // Prepare options
    const options = {
      prompt,
      creativity: creativity ? parseFloat(creativity) : undefined,
      output_format
    };

    let upscaledImageBuffer;

    // Choose upscaling method based on type
    switch (type) {
      case 'conservative':
        upscaledImageBuffer = await stabilityService.upscaleImageConservative(imageBuffer, options);
        break;
      case 'creative':
        upscaledImageBuffer = await stabilityService.upscaleImageCreative(imageBuffer, options);
        break;
      case 'fast':
        upscaledImageBuffer = await stabilityService.upscaleImageFast(imageBuffer, options);
        break;
      default:
        throw new Error(`Unsupported upscale type: ${type}`);
    }

    // Save upscaled image
    const filename = `upscaled-${type}-${Date.now()}.${output_format}`;
    const filepath = path.join(__dirname, '../uploads', filename);
    fs.writeFileSync(filepath, upscaledImageBuffer);

    // Get image dimensions using sharp
    const imageInfo = await sharp(upscaledImageBuffer).metadata();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log('✅ Image upscaling completed');

    res.json({
      success: true,
      imageUrl: `/uploads/${filename}`,
      type,
      size: upscaledImageBuffer.length,
      width: imageInfo.width,
      height: imageInfo.height
    });

  } catch (error) {
    console.error('Upscale error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Multi-image fusion endpoint
router.post('/fuse', upload.single('image'), async (req, res) => {
  try {
    console.log('🎭 Multi-image fusion request received');

    if (!req.file) {
      return res.status(400).json({ error: 'No stitched image file provided' });
    }

    const { prompt } = req.body;
    let options = {};

    try {
      options = req.body.options ? JSON.parse(req.body.options) : {};
    } catch (e) {
      console.warn('Failed to parse options:', e);
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('📋 Fusion request details:', {
      prompt,
      options,
      fileSize: req.file.size,
      fileName: req.file.filename
    });

    // Convert uploaded image to base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fluxService.imageToBase64(imageBuffer);

    // Use editImage method for fusion (since it's essentially image-to-image editing)
    const request = await fluxService.editImage(prompt, imageBase64, options);
    console.log('🎯 Fusion request created:', request.id);

    // Poll for result
    const result = await fluxService.pollForResult(request);

    if (result.status === 'Ready' && result.result?.sample) {
      // Download the fused image
      const fusedImageBuffer = await fluxService.downloadImage(result.result.sample);

      // Save to uploads directory
      const filename = `fused-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../uploads', filename);
      fs.writeFileSync(filepath, fusedImageBuffer);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      // Clean up uploaded file on failure
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Image fusion failed', status: result.status });
    }

  } catch (error) {
    console.error('Fusion error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Style transfer endpoint
router.post('/style-transfer', upload.single('image'), async (req, res) => {
  try {
    console.log('🎭 Style transfer request received');

    if (!req.file) {
      return res.status(400).json({ error: 'Content image is required' });
    }

    const { prompt } = req.body;
    let options = {};

    try {
      options = req.body.options ? JSON.parse(req.body.options) : {};
    } catch (e) {
      console.warn('Failed to parse options:', e);
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Style prompt is required' });
    }

    console.log('📋 Style transfer request details:', {
      prompt,
      options,
      imageSize: req.file.size,
      imageName: req.file.filename
    });

    // Convert image to base64 (this will be the base image for editing)
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fluxService.imageToBase64(imageBuffer);

    // For style transfer, we'll use BFL's recommended approach:
    // Use the content image as base and apply style through detailed prompting
    // This is simpler and more aligned with FLUX.1 Kontext capabilities
    // Create style transfer prompt based on BFL best practices
    // According to BFL docs, FLUX.1 Kontext excels at style transfer through detailed prompting
    const styleTransferPrompt = `Transform this image to ${prompt}. Apply the artistic style while maintaining the original composition, subject placement, and key elements. Preserve the exact camera angle, position, and framing. Only change the visual style, colors, textures, and artistic treatment.`;

    console.log('🎨 Style transfer prompt:', styleTransferPrompt);

    // Use the image as base and apply style through prompt
    // This follows BFL's recommended approach for style transfer
    const request = await fluxService.editImage(styleTransferPrompt, imageBase64, options);
    console.log('🎯 Style transfer request created:', request.id);

    // Poll for result
    const result = await fluxService.pollForResult(request);

    if (result.status === 'Ready' && result.result?.sample) {
      // Download the style transferred image
      const transferredImageBuffer = await fluxService.downloadImage(result.result.sample);

      // Save to uploads directory
      const filename = `style-transfer-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../uploads', filename);
      fs.writeFileSync(filepath, transferredImageBuffer);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      // Clean up uploaded file on failure
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Style transfer failed', status: result.status });
    }

  } catch (error) {
    console.error('Style transfer error:', error);
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
