const express = require('express');
const router = express.Router();
const simpleYouTubeController = require('../controllers/simpleYouTubeController');

// Start YouTube streaming
router.post('/start', simpleYouTubeController.startStream);

// Stop YouTube streaming
router.post('/stop', simpleYouTubeController.stopStream);

// Get stream status
router.get('/status/:roomId', simpleYouTubeController.getStreamStatus);

// Get all active streams
router.get('/all', simpleYouTubeController.getAllStreams);

// Test FFmpeg functionality
router.post('/test-ffmpeg', simpleYouTubeController.testFFmpeg);

// Reset stream key for specific room
router.post('/reset-stream-key', simpleYouTubeController.resetStreamKey);

// Reset all stream keys
router.post('/reset-all-stream-keys', simpleYouTubeController.resetAllStreamKeys);

// Update stream key for specific room
router.post('/update-stream-key', simpleYouTubeController.updateStreamKey);

// Get current stream key for specific room
router.get('/current-stream-key/:roomId', simpleYouTubeController.getCurrentStreamKey);

module.exports = router;
