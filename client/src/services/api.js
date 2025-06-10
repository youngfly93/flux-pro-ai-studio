import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for image generation
});

// Image generation API
export const generateImage = async (prompt, options = {}) => {
  try {
    const response = await api.post('/images/generate', {
      prompt,
      options
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to generate image');
  }
};

// Image editing API
export const editImage = async (imageFile, prompt, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);
    formData.append('options', JSON.stringify(options));

    // Add mask if provided for inpainting
    if (options.mask) {
      formData.append('mask', options.mask);
    }

    const response = await api.post('/images/edit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to edit image');
  }
};

// Image expansion API
export const expandImage = async (imageFile, prompt, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);
    formData.append('options', JSON.stringify(options));

    const response = await api.post('/images/expand', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to expand image');
  }
};

// Check request status
export const checkStatus = async (requestId) => {
  try {
    const response = await api.get(`/images/status/${requestId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to check status');
  }
};

// Health check
// AI Image Upscaling
export const upscaleImage = async (imageFile, upscaleType = 'conservative', options = {}) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('type', upscaleType);

    // Add options
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    if (options.creativity !== undefined) {
      formData.append('creativity', options.creativity.toString());
    }
    if (options.output_format) {
      formData.append('output_format', options.output_format);
    }

    const response = await api.post('/images/upscale', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes timeout
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error('Upscale API error:', error);
    if (error.response?.data?.error) {
      throw new Error(`Failed to upscale image: ${error.response.data.error}`);
    }
    throw new Error(`Failed to upscale image: ${error.message}`);
  }
};

// Multi-image fusion API
export const fuseImages = async (stitchedImageFile, prompt, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('image', stitchedImageFile);
    formData.append('prompt', prompt);
    formData.append('options', JSON.stringify(options));

    const response = await api.post('/images/fuse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for fusion
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error('Fusion API error:', error);
    if (error.response?.data?.error) {
      throw new Error(`Failed to fuse images: ${error.response.data.error}`);
    }
    throw new Error(`Failed to fuse images: ${error.message}`);
  }
};

// Style transfer API
export const transferStyle = async (contentImageFile, prompt, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('image', contentImageFile);
    formData.append('prompt', prompt);
    formData.append('options', JSON.stringify(options));

    const response = await api.post('/images/style-transfer', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for style transfer
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error('Style transfer API error:', error);
    if (error.response?.data?.error) {
      throw new Error(`Failed to transfer style: ${error.response.data.error}`);
    }
    throw new Error(`Failed to transfer style: ${error.message}`);
  }
};

export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Server is not responding');
  }
};

export default api;
