const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./src/config/db');
const { seedInitialData } = require('./src/config/seed');
const { initWebSocket } = require('./src/config/websocket');
const { JWT_SECRET } = require('./src/middleware/auth');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const commentRoutes = require('./src/routes/commentRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Initialize Database & Seed
initializeDatabase();
seedInitialData();

// Initialize WebSocket server on same HTTP port
initWebSocket(server, JWT_SECRET);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CodeAlpha Collaborative Project Management Tool',
    timestamp: new Date().toISOString()
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 CodeAlpha Project Management Tool running on http://localhost:${PORT}`);
});

module.exports = { app, server };
