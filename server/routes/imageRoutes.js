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
router.post('/style-transfer', upload.fields([
  { name: 'contentImage', maxCount: 1 },
  { name: 'styleImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🎭 Style transfer request received');

    if (!req.files || !req.files.contentImage || !req.files.styleImage) {
      return res.status(400).json({ error: 'Both content and style images are required' });
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

    const contentImageFile = req.files.contentImage[0];
    const styleImageFile = req.files.styleImage[0];

    console.log('📋 Style transfer request details:', {
      prompt,
      options,
      contentImageSize: contentImageFile.size,
      styleImageSize: styleImageFile.size,
      contentImageName: contentImageFile.filename,
      styleImageName: styleImageFile.filename
    });

    // Convert content image to base64
    const contentImageBuffer = fs.readFileSync(contentImageFile.path);
    const contentImageBase64 = fluxService.imageToBase64(contentImageBuffer);

    // Convert style image to base64
    const styleImageBuffer = fs.readFileSync(styleImageFile.path);
    const styleImageBase64 = fluxService.imageToBase64(styleImageBuffer);

    // Create a composite image by combining content and style images side by side
    // This helps the AI understand both the content and the style reference
    const sharp = require('sharp');

    try {
      // Get image dimensions
      const contentMetadata = await sharp(contentImageBuffer).metadata();
      const styleMetadata = await sharp(styleImageBuffer).metadata();

      // Calculate target dimensions (make both images same height)
      const targetHeight = Math.min(1024, Math.max(contentMetadata.height, styleMetadata.height));
      const contentWidth = Math.round((contentMetadata.width * targetHeight) / contentMetadata.height);
      const styleWidth = Math.round((styleMetadata.width * targetHeight) / styleMetadata.height);

      // Create composite image with white border between images
      const borderWidth = 20;
      const compositeWidth = contentWidth + styleWidth + borderWidth;

      const compositeBuffer = await sharp({
        create: {
          width: compositeWidth,
          height: targetHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite([
        {
          input: await sharp(contentImageBuffer).resize(contentWidth, targetHeight).toBuffer(),
          left: 0,
          top: 0
        },
        {
          input: await sharp(styleImageBuffer).resize(styleWidth, targetHeight).toBuffer(),
          left: contentWidth + borderWidth,
          top: 0
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

      const compositeBase64 = fluxService.imageToBase64(compositeBuffer);

      // Create enhanced style transfer prompt
      const styleTransferPrompt = `The left image shows the content that needs style transfer. The right image shows the reference style. Apply the artistic style, colors, textures, and visual characteristics from the right image to the content of the left image. ${prompt}. Maintain the composition and subjects from the left image while adopting the artistic style from the right image.`;

      var request = await fluxService.editImage(styleTransferPrompt, compositeBase64, options);
    } catch (sharpError) {
      console.warn('Sharp processing failed, falling back to simple method:', sharpError);
      // Fallback to simple method if Sharp fails
      const fallbackPrompt = `Apply the artistic style and visual characteristics to the content image. ${prompt}`;
      var request = await fluxService.editImage(fallbackPrompt, contentImageBase64, options);
    }
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

      // Clean up uploaded files
      fs.unlinkSync(contentImageFile.path);
      fs.unlinkSync(styleImageFile.path);

      res.json({
        success: true,
        imageUrl: `/uploads/${filename}`,
        originalUrl: result.result.sample,
        requestId: request.id
      });
    } else {
      // Clean up uploaded files on failure
      fs.unlinkSync(contentImageFile.path);
      fs.unlinkSync(styleImageFile.path);
      res.status(500).json({ error: 'Style transfer failed', status: result.status });
    }

  } catch (error) {
    console.error('Style transfer error:', error);
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.contentImage && req.files.contentImage[0] && fs.existsSync(req.files.contentImage[0].path)) {
        fs.unlinkSync(req.files.contentImage[0].path);
      }
      if (req.files.styleImage && req.files.styleImage[0] && fs.existsSync(req.files.styleImage[0].path)) {
        fs.unlinkSync(req.files.styleImage[0].path);
      }
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
