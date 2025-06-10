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

    const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
    const allowedMimes = /image\/(jpeg|jpg|png|gif|webp|avif)/;

    // 对于从 canvas 生成的文件，可能没有 originalname
    const extname = file.originalname ?
      allowedTypes.test(path.extname(file.originalname).toLowerCase().replace('.', '')) : true;
    const mimetype = allowedMimes.test(file.mimetype);

    console.log('📋 File validation:', { extname, mimetype, originalname: file.originalname, mimetype: file.mimetype });

    if (mimetype && extname) {
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

    // Get original image dimensions to preserve aspect ratio (unless it's inpainting)
    if (!mask) {
      const sharp = require('sharp');
      const imageInfo = await sharp(imageBuffer).metadata();
      const originalAspectRatio = imageInfo.width / imageInfo.height;

      // Calculate the closest standard aspect ratio
      let aspectRatio = '1:1'; // default
      if (originalAspectRatio > 1.7) {
        aspectRatio = '16:9';
      } else if (originalAspectRatio > 1.4) {
        aspectRatio = '3:2';
      } else if (originalAspectRatio > 1.2) {
        aspectRatio = '4:3';
      } else if (originalAspectRatio > 0.9) {
        aspectRatio = '1:1';
      } else if (originalAspectRatio > 0.7) {
        aspectRatio = '3:4';
      } else if (originalAspectRatio > 0.5) {
        aspectRatio = '2:3';
      } else {
        aspectRatio = '9:16';
      }

      // Override aspect ratio if not explicitly set in options
      if (!parsedOptions.aspect_ratio) {
        parsedOptions.aspect_ratio = aspectRatio;
      }

      console.log(`📐 Original image: ${imageInfo.width}x${imageInfo.height} (ratio: ${originalAspectRatio.toFixed(2)}) -> Using aspect ratio: ${parsedOptions.aspect_ratio}`);
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

    // Get original image dimensions to preserve aspect ratio
    const sharp = require('sharp');
    const imageInfo = await sharp(imageBuffer).metadata();
    const originalAspectRatio = imageInfo.width / imageInfo.height;

    // Calculate the closest standard aspect ratio
    let aspectRatio = '1:1'; // default
    if (originalAspectRatio > 1.7) {
      aspectRatio = '16:9';
    } else if (originalAspectRatio > 1.4) {
      aspectRatio = '3:2';
    } else if (originalAspectRatio > 1.2) {
      aspectRatio = '4:3';
    } else if (originalAspectRatio > 0.9) {
      aspectRatio = '1:1';
    } else if (originalAspectRatio > 0.7) {
      aspectRatio = '3:4';
    } else if (originalAspectRatio > 0.5) {
      aspectRatio = '2:3';
    } else {
      aspectRatio = '9:16';
    }

    // Override aspect ratio if not explicitly set in options
    if (!options.aspect_ratio) {
      options.aspect_ratio = aspectRatio;
    }

    console.log(`📐 Original image: ${imageInfo.width}x${imageInfo.height} (ratio: ${originalAspectRatio.toFixed(2)}) -> Using aspect ratio: ${options.aspect_ratio}`);

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

// Style transfer with image reference
router.post('/style-transfer-reference', upload.fields([
  { name: 'contentImage', maxCount: 1 },
  { name: 'styleImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🎭 Style transfer with image reference request received');

    if (!req.files || !req.files.contentImage || !req.files.styleImage) {
      return res.status(400).json({ error: 'Both content image and style reference image are required' });
    }

    const contentImageFile = req.files.contentImage[0];
    const styleImageFile = req.files.styleImage[0];
    const { prompt = '' } = req.body;
    let options = {};

    try {
      options = req.body.options ? JSON.parse(req.body.options) : {};
    } catch (e) {
      console.warn('Failed to parse options:', e);
    }

    console.log('📋 Style transfer with reference request details:', {
      prompt,
      options,
      contentImageSize: contentImageFile.size,
      styleImageSize: styleImageFile.size,
      contentImageName: contentImageFile.filename,
      styleImageName: styleImageFile.filename
    });

    // Read both images
    const contentImageBuffer = fs.readFileSync(contentImageFile.path);
    const styleImageBuffer = fs.readFileSync(styleImageFile.path);

    // Get original content image dimensions to preserve aspect ratio
    const sharp = require('sharp');
    const imageInfo = await sharp(contentImageBuffer).metadata();
    const originalAspectRatio = imageInfo.width / imageInfo.height;

    // Calculate the closest standard aspect ratio
    let aspectRatio = '1:1'; // default
    if (originalAspectRatio > 1.7) {
      aspectRatio = '16:9';
    } else if (originalAspectRatio > 1.4) {
      aspectRatio = '3:2';
    } else if (originalAspectRatio > 1.2) {
      aspectRatio = '4:3';
    } else if (originalAspectRatio > 0.9) {
      aspectRatio = '1:1';
    } else if (originalAspectRatio > 0.7) {
      aspectRatio = '3:4';
    } else if (originalAspectRatio > 0.5) {
      aspectRatio = '2:3';
    } else {
      aspectRatio = '9:16';
    }

    // Override aspect ratio if not explicitly set in options
    if (!options.aspect_ratio) {
      options.aspect_ratio = aspectRatio;
    }

    console.log(`📐 Original content image: ${imageInfo.width}x${imageInfo.height} (ratio: ${originalAspectRatio.toFixed(2)}) -> Using aspect ratio: ${options.aspect_ratio}`);

    // Create a stitched image with content on left and style reference on right
    // Add white border between images to help AI distinguish them
    const borderWidth = 20; // Increased border width for better separation
    const maxHeight = 1024; // Limit height for processing

    // Resize images to same height while maintaining aspect ratio
    const contentResized = await sharp(contentImageBuffer)
      .resize({ height: maxHeight, withoutEnlargement: true })
      .toBuffer();

    const styleResized = await sharp(styleImageBuffer)
      .resize({ height: maxHeight, withoutEnlargement: true })
      .toBuffer();

    // Get dimensions of resized images
    const contentMeta = await sharp(contentResized).metadata();
    const styleMeta = await sharp(styleResized).metadata();

    // Create stitched image
    const stitchedWidth = contentMeta.width + styleMeta.width + borderWidth;
    const stitchedHeight = Math.max(contentMeta.height, styleMeta.height);

    const stitchedImageBuffer = await sharp({
      create: {
        width: stitchedWidth,
        height: stitchedHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: contentResized, left: 0, top: 0 },
      { input: styleResized, left: contentMeta.width + borderWidth, top: 0 }
    ])
    .jpeg()
    .toBuffer();

    // Convert stitched image to base64
    const stitchedImageBase64 = fluxService.imageToBase64(stitchedImageBuffer);

    // Implement FLUX.1 Kontext best practices for style transfer
    // Based on official recommendations and community best practices

    // Analyze reference image to determine style characteristics
    // TODO: In the future, we could implement AI-based style analysis here
    // For now, we'll use intelligent defaults based on common style transfer scenarios

    // Common style descriptions that work well with FLUX.1 Kontext
    const styleDescriptions = {
      cartoon: "cartoon 3D animation style similar to Pixar or Disney animation with smooth surfaces, bright vibrant colors, simplified but expressive facial features, and 3D animation aesthetics",
      anime: "anime/manga style with large expressive eyes, stylized proportions, clean line art, and vibrant colors",
      watercolor: "watercolor painting style with soft brushstrokes, flowing colors, and artistic texture",
      oil_painting: "oil painting style with visible brushstrokes, rich textures, and classical artistic rendering",
      sketch: "pencil sketch style with natural graphite lines, cross-hatching, and visible paper texture"
    };

    // Default to cartoon style as it works well for most cases
    const defaultStyleDescription = styleDescriptions.cartoon;

    // Create optimized style transfer prompt following FLUX.1 Kontext guidelines
    // Template: "转换为[特定风格]，同时保持[构图/角色/其他]不变"
    const styleTransferPrompt = prompt
      ? `Convert to ${defaultStyleDescription}, while keeping the exact same person, pose, facial expression, clothing, and scene composition unchanged. ${prompt}. Maintain all original details and proportions.`
      : `Convert to ${defaultStyleDescription}, while keeping the exact same person, pose, facial expression, clothing, background, and scene composition unchanged. Maintain all original details, proportions, and characteristics of the subject.`;

    console.log('🎨 Optimized style transfer prompt:', styleTransferPrompt);

    // Use FLUX.1 Kontext recommended parameters for style transfer
    const { model, steps, guidance, safety_tolerance, output_format } = options;
    const styleTransferOptions = {
      model: model || 'flux-kontext-max',
      width: imageInfo.width,
      height: imageInfo.height,
      steps: steps || 50, // Increased steps for better quality as per article
      guidance: guidance || 3.0, // Optimal guidance value from article recommendations
      safety_tolerance: safety_tolerance || 2,
      output_format: output_format || 'jpeg'
    };

    console.log('🔧 Style transfer options:', styleTransferOptions);

    // Use the original content image for style transfer (not stitched)
    const contentImageBase64 = fluxService.imageToBase64(contentImageBuffer);
    const request = await fluxService.editImage(styleTransferPrompt, contentImageBase64, styleTransferOptions);
    console.log('🎯 Style transfer with reference request created:', request.id);

    // Poll for result
    const result = await fluxService.pollForResult(request);

    if (result.status === 'Ready' && result.result?.sample) {
      // Download the style transferred image
      const transferredImageBuffer = await fluxService.downloadImage(result.result.sample);

      // Save to uploads directory
      const filename = `style-transfer-reference-${Date.now()}.jpg`;
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
      res.status(500).json({ error: 'Style transfer with reference failed', status: result.status });
    }

  } catch (error) {
    console.error('Style transfer with reference error:', error);
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
