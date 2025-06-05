const axios = require('axios');
const FormData = require('form-data');

class StabilityService {
  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY;
    this.baseURL = 'https://api.stability.ai';
  }

  checkApiKey() {
    if (!this.apiKey) {
      throw new Error('Stability AI API key not configured');
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'image/*'
    };
  }

  // Upscale image using Conservative Upscaler
  async upscaleImageConservative(imageBuffer, options = {}) {
    try {
      this.checkApiKey();

      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });

      // Add required prompt parameter (required by Stability AI)
      const prompt = options.prompt || 'high quality, detailed, sharp';
      formData.append('prompt', prompt);
      if (options.negative_prompt) {
        formData.append('negative_prompt', options.negative_prompt);
      }
      if (options.seed !== undefined) {
        formData.append('seed', options.seed.toString());
      }
      if (options.creativity !== undefined) {
        formData.append('creativity', options.creativity.toString());
      }
      if (options.output_format) {
        formData.append('output_format', options.output_format);
      }

      console.log('🔍 Starting conservative upscale...');
      console.log('📋 Upscale options:', {
        hasPrompt: !!options.prompt,
        creativity: options.creativity || 0.35,
        output_format: options.output_format || 'png'
      });

      const response = await axios.post(
        `${this.baseURL}/v2beta/stable-image/upscale/conservative`,
        formData,
        {
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 minutes timeout
        }
      );

      console.log('✅ Conservative upscale completed');
      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ Error in conservative upscale:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data?.toString());
      console.error('Message:', error.message);
      throw new Error(`Failed to upscale image: ${error.response?.data?.toString() || error.message}`);
    }
  }

  // Upscale image using Creative Upscaler (if available)
  async upscaleImageCreative(imageBuffer, options = {}) {
    try {
      this.checkApiKey();

      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });

      // Add required prompt parameter for creative upscaler
      const prompt = options.prompt || 'enhance image quality, add details, improve sharpness';
      formData.append('prompt', prompt);
      if (options.negative_prompt) {
        formData.append('negative_prompt', options.negative_prompt);
      }
      if (options.seed !== undefined) {
        formData.append('seed', options.seed.toString());
      }
      if (options.creativity !== undefined) {
        formData.append('creativity', options.creativity.toString());
      }
      if (options.output_format) {
        formData.append('output_format', options.output_format);
      }

      console.log('🎨 Starting creative upscale...');
      console.log('📋 Upscale options:', {
        prompt: options.prompt || 'enhance image quality',
        creativity: options.creativity || 0.35,
        output_format: options.output_format || 'png'
      });

      const response = await axios.post(
        `${this.baseURL}/v2beta/stable-image/upscale/creative`,
        formData,
        {
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 minutes timeout
        }
      );

      console.log('✅ Creative upscale completed');
      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ Error in creative upscale:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data?.toString());
      console.error('Message:', error.message);
      throw new Error(`Failed to upscale image: ${error.response?.data?.toString() || error.message}`);
    }
  }

  // Fast upscale using Real-ESRGAN (if available)
  async upscaleImageFast(imageBuffer, options = {}) {
    try {
      this.checkApiKey();

      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });

      if (options.output_format) {
        formData.append('output_format', options.output_format);
      }

      console.log('⚡ Starting fast upscale...');
      console.log('📋 Upscale options:', {
        output_format: options.output_format || 'png'
      });

      const response = await axios.post(
        `${this.baseURL}/v2beta/stable-image/upscale/fast`,
        formData,
        {
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer',
          timeout: 60000 // 1 minute timeout for fast upscale
        }
      );

      console.log('✅ Fast upscale completed');
      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ Error in fast upscale:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data?.toString());
      console.error('Message:', error.message);
      throw new Error(`Failed to upscale image: ${error.response?.data?.toString() || error.message}`);
    }
  }

  // Get account balance/credits
  async getAccountInfo() {
    try {
      this.checkApiKey();

      const response = await axios.get(
        `${this.baseURL}/v1/user/account`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting account info:', error.response?.data || error.message);
      throw new Error(`Failed to get account info: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new StabilityService();
