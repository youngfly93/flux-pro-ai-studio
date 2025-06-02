const axios = require('axios');

class FluxService {
  constructor() {
    this.apiKey = process.env.BFL_API_KEY;
    this.baseURL = process.env.BFL_API_BASE_URL || 'https://api.bfl.ai';
  }

  // Check if API key is configured
  checkApiKey() {
    if (!this.apiKey) {
      throw new Error('BFL_API_KEY is required');
    }
  }

  // Create headers for API requests
  getHeaders() {
    return {
      'accept': 'application/json',
      'x-key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  // Generate image from text prompt
  async generateImage(prompt, options = {}) {
    try {
      this.checkApiKey();
      const requestData = {
        prompt,
        aspect_ratio: options.aspect_ratio || "1:1",
        seed: options.seed || null,
        prompt_upsampling: options.prompt_upsampling || false,
        safety_tolerance: options.safety_tolerance || 2,
        output_format: options.output_format || "jpeg"
      };

      // Add webhook parameters if provided
      if (options.webhook_url) {
        requestData.webhook_url = options.webhook_url;
      }
      if (options.webhook_secret) {
        requestData.webhook_secret = options.webhook_secret;
      }

      console.log('🎨 Generating image with prompt:', prompt);
      console.log('📋 Request data:', requestData);

      const response = await axios.post(
        `${this.baseURL}/v1/flux-kontext-pro`,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log('🎯 Generation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error generating image:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw new Error(`Failed to generate image: ${error.response?.data?.message || error.message}`);
    }
  }

  // Edit image with text prompt
  async editImage(prompt, inputImageBase64, options = {}) {
    try {
      this.checkApiKey();
      const requestData = {
        prompt,
        input_image: inputImageBase64,
        seed: options.seed || null,
        safety_tolerance: options.safety_tolerance || 2,
        output_format: options.output_format || "jpeg"
      };

      // Add webhook parameters if provided
      if (options.webhook_url) {
        requestData.webhook_url = options.webhook_url;
      }
      if (options.webhook_secret) {
        requestData.webhook_secret = options.webhook_secret;
      }

      console.log('✏️ Editing image with prompt:', prompt);
      console.log('📋 Edit request data:', requestData);

      const response = await axios.post(
        `${this.baseURL}/v1/flux-kontext-pro`,
        requestData,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Error editing image:', error.response?.data || error.message);
      throw new Error(`Failed to edit image: ${error.response?.data?.message || error.message}`);
    }
  }

  // Poll for result using request ID or polling URL
  async getResult(requestId, pollingUrl = null) {
    try {
      const url = pollingUrl || `${this.baseURL}/v1/get_result?id=${requestId}`;
      const response = await axios.get(url, { headers: this.getHeaders() });

      return response.data;
    } catch (error) {
      console.error('Error getting result:', error.response?.data || error.message);
      throw new Error(`Failed to get result: ${error.response?.data?.message || error.message}`);
    }
  }

  // Poll for result with automatic retry
  async pollForResult(requestData, maxAttempts = 60, intervalMs = 2000) {
    let attempts = 0;
    const requestId = requestData.id || requestData;
    const pollingUrl = requestData.polling_url;

    while (attempts < maxAttempts) {
      try {
        const result = await this.getResult(requestId, pollingUrl);

        console.log(`📊 Status: ${result.status} (attempt ${attempts + 1})`);

        if (result.status === 'Ready') {
          return result;
        } else if (result.status === 'Failed' || result.status === 'Error') {
          throw new Error(`Request failed with status: ${result.status}`);
        } else if (result.status === 'Request Moderated') {
          throw new Error('请求被内容审核系统拦截，请尝试使用更温和的描述');
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;

      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }

    throw new Error('Request timed out after maximum attempts');
  }

  // Convert image file to base64
  imageToBase64(buffer) {
    return buffer.toString('base64');
  }

  // Download image from URL
  async downloadImage(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading image:', error.message);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }
}

module.exports = new FluxService();
