const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testRoutes = require('./routes/testRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5175',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/images', testRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test Flux Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5175'}`);
  console.log(`🔑 API Key configured: ${process.env.BFL_API_KEY ? 'Yes' : 'No'}`);
});

// Keep the server alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Heartbeat to keep process alive
setInterval(() => {
  console.log('⏰ Server heartbeat:', new Date().toLocaleTimeString());
}, 60000);
