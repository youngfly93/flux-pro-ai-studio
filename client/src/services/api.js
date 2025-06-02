import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

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
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Server is not responding');
  }
};

export default api;
