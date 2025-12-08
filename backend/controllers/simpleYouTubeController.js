const simpleYouTube = require('../services/simpleYouTube');
const { LiveStream } = require('../models');

// Start YouTube streaming
exports.startStream = async (req, res) => {
  try {
    console.log('[SimpleYouTube] Start stream request received');
    console.log('[SimpleYouTube] Request body:', req.body);
    
    const { roomId, streamKey, title } = req.body;
    console.log('[SimpleYouTube] Extracted parameters:', { roomId, streamKey, title });
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    if (!streamKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key is required. Please provide your YouTube stream key.'
      });
    }

    // Get livestream data from database
    console.log('[SimpleYouTube] Fetching livestream data for roomId:', roomId);
    const livestream = await LiveStream.findByPk(roomId);
    console.log('[SimpleYouTube] Database query result:', livestream ? 'Found' : 'Not found');
    
    if (!livestream) {
      console.log('[SimpleYouTube] Livestream not found for roomId:', roomId);
      return res.status(404).json({
        success: false,
        error: 'Live stream not found',
        details: `No livestream found with id: ${roomId}`
      });
    }
    
    // Use title from database, fallback to provided title or default
    let finalTitle = livestream.title || title || `Live Stream ${roomId}`;
    
    console.log('[SimpleYouTube] Starting stream with stream key:', { roomId, streamKey, title: finalTitle });
    
    // Start streaming
    let result;
    try {
      console.log('[SimpleYouTube] Starting stream...');
      result = await simpleYouTube.startStream(
        roomId,
        streamKey,
        finalTitle
      );
      console.log('[SimpleYouTube] Stream started successfully:', result);
    } catch (streamError) {
      console.error('[SimpleYouTube] Stream error details:', {
        message: streamError.message,
        stack: streamError.stack,
        name: streamError.name
      });
      
      throw streamError;
    }

    res.json({
      success: true,
      message: 'YouTube streaming started successfully!',
      data: result
    });

  } catch (error) {
    console.error('[SimpleYouTube] Error starting stream:', error);
    console.error('[SimpleYouTube] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to start YouTube streaming',
      details: error.message,
      stack: error.stack
    });
  }
};

// Stop YouTube streaming
exports.stopStream = async (req, res) => {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    console.log('[SimpleYouTube] Stopping stream for room:', roomId);
    
    const result = await simpleYouTube.stopStream(roomId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Stream stopped successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to stop stream'
      });
    }
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop stream',
      details: error.message
    });
  }
};

// Get stream status
exports.getStreamStatus = (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    const status = simpleYouTube.getStreamStatus(roomId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream status',
      details: error.message
    });
  }
};

// Get all active streams
exports.getAllStreams = (req, res) => {
  try {
    const allStreams = simpleYouTube.getAllStreams();
    
    res.json({
      success: true,
      data: allStreams
    });
  } catch (error) {
    console.error('Error getting all streams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streams',
      details: error.message
    });
  }
};

// Test FFmpeg functionality
exports.testFFmpeg = async (req, res) => {
  try {
    console.log('[SimpleYouTube] Testing FFmpeg functionality...');
    
    const { spawn } = require('child_process');
    
    // Test FFmpeg with a simple command
    const ffmpegTestProcess = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1',
      '-t', '2',
      '-f', 'null',
      '-'
    ], { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    let ffmpegWorking = false;
    
    // Set timeout for the test
    const timeout = setTimeout(() => {
      if (!ffmpegTestProcess.killed) {
        console.log('[SimpleYouTube] Test timeout, killing process');
        ffmpegTestProcess.kill('SIGTERM');
      }
    }, 5000); // 5 second timeout
    
    ffmpegTestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpegTestProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.log(`[SimpleYouTube] ${dataStr}`);
      
      // Check if FFmpeg is working by looking for key indicators
      if (dataStr.includes('Input #0, lavfi') || 
          dataStr.includes('Stream #0:0: Video:') || 
          dataStr.includes('Duration: N/A') ||
          dataStr.includes('bitrate: N/A')) {
        ffmpegWorking = true;
        console.log('[SimpleYouTube] FFmpeg is working - can process video');
      }
    });
    
    ffmpegTestProcess.on('exit', (code) => {
      clearTimeout(timeout);
      console.log(`[SimpleYouTube] Test process exited with code: ${code}`);
      
      const success = ffmpegWorking;
      
      res.json({
        success: success,
        exitCode: code,
        ffmpegWorking: ffmpegWorking,
        output: output,
        error: errorOutput,
        message: success ? 'FFmpeg test successful' : 'FFmpeg test failed'
      });
    });
    
    ffmpegTestProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[SimpleYouTube] Test process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'FFmpeg test failed - FFmpeg not found'
      });
    });
    
  } catch (error) {
    console.error('Error testing FFmpeg:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test FFmpeg'
    });
  }
};

exports.resetStreamKey = async (req, res) => {
  try {
    const { roomId } = req.body;
    const result = await simpleYouTube.resetStreamKey(roomId);
    res.json({ success: true, message: 'Stream key reset successfully', data: result });
  } catch (error) {
    console.error('Error resetting YouTube stream key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resetAllStreamKeys = async (req, res) => {
  try {
    const result = await simpleYouTube.resetAllStreamKeys();
    res.json({ success: true, message: 'All stream keys reset successfully', data: result });
  } catch (error) {
    console.error('Error resetting all YouTube stream keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStreamKey = async (req, res) => {
  try {
    const { roomId, newStreamKey } = req.body;
    const result = await simpleYouTube.updateStreamKey(roomId, newStreamKey);
    res.json({ success: true, message: 'Stream key updated successfully', data: result });
  } catch (error) {
    console.error('Error updating YouTube stream key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCurrentStreamKey = (req, res) => {
  try {
    const { roomId } = req.params;
    const result = simpleYouTube.getCurrentStreamKey(roomId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting current YouTube stream key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
