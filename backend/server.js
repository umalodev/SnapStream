require('dotenv').config();

const express = require('express');
const app = express();
const livestreamRoutes = require('./routes/livestream');
const { sequelize, User, LiveStream } = require('./models');
const userRoutes = require('./routes/users');
const recordingRoutes = require('./routes/recording');
const activityLogRoutes = require('./routes/activityLog');
const simpleYouTubeRoutes = require('./routes/simpleYouTube');


const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

app.use(express.json());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: false
}));


// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Session middleware dihapus - menggunakan JWT authentication

// Sinkronisasi model ke database (otomatis buat tabel jika belum ada)
sequelize.sync()
  .then(() => console.log('All models were synchronized successfully.'))
  .catch(err => console.error('Sync error:', err));

// Jalankan mediaServer.js (NodeMediaServer untuk RTMP/HLS)

// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Recording App Backend Server', 
    timestamp: new Date().toISOString() 
  });
});

app.use('/api/users', userRoutes);
app.use('/api/recording', recordingRoutes);
// Back-compat: allow plural base path as used by some frontend calls
app.use('/api/recordings', recordingRoutes);
app.use('/api/livestream', livestreamRoutes);
app.use('/api/activity', activityLogRoutes);
app.use('/api/youtube', simpleYouTubeRoutes);

// Serve React app for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = config.PORT;
const HOST = config.HOST;
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Database: ${config.DB_HOST}:${config.DB_PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
});

