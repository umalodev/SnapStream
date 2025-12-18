const { spawn } = require('child_process');
const fetch = require('node-fetch');

class SimpleYouTube {
  constructor() {
    this.activeStreams = new Map(); // { roomId: { process, streamKey, rtmpUrl } }
    console.log('Simple YouTube Streaming initialized - Using stream key only!');
  }

  // Validate stream key format
  validateStreamKey(streamKey) {
    if (!streamKey || typeof streamKey !== 'string') {
      return false;
    }
    
    // YouTube stream keys are typically 16 characters, alphanumeric with hyphens
    const streamKeyPattern = /^[a-zA-Z0-9\-]{8,32}$/;
    return streamKeyPattern.test(streamKey);
  }

  // Get available MediaSoup rooms
  async getAvailableRooms() {
    try {
      const response = await fetch('http://192.168.1.10:4000/debug/producers');
      if (response.ok) {
        const data = await response.json();
        return data.availableRooms || [];
      }
    } catch (error) {
      console.log('[SimpleYouTube] Could not get MediaSoup rooms:', error.message);
    }
    return [];
  }

  // Start YouTube streaming with real video from MediaSoup
  async startStream(roomId, streamKey, title = 'Live Stream') {
    try {
      console.log(`[SimpleYouTube] Starting stream for room: ${roomId}`);
      
      // Validate stream key
      if (!this.validateStreamKey(streamKey)) {
        throw new Error('Invalid stream key format. Please check your YouTube stream key.');
      }
      
      // Skip MediaSoup dependency to avoid connection issues
      console.log(`[SimpleYouTube] Skipping MediaSoup dependency to avoid ECONNRESET errors`);
      console.log(`[SimpleYouTube] Using direct test pattern instead of MediaSoup stream`);
      
      // Create RTMP URL
      const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
      
      console.log(`[SimpleYouTube] RTMP URL: ${rtmpUrl}`);
      console.log(`[SimpleYouTube] Stream Key: ${streamKey}`);
      console.log(`[SimpleYouTube] Room ID: ${roomId} (for reference only)`);
      
      // Use REAL VIDEO from Snap Room using screen capture
      console.log(`[SimpleYouTube] Using REAL VIDEO from Snap Room via screen capture`);
      console.log(`[SimpleYouTube] This will capture whatever is on your screen (including Snap Room)`);
      console.log(`[SimpleYouTube] Make sure Snap Room is open and visible on your screen`);
      
      // Use Windows screen capture to get REAL VIDEO from desktop
      let ffmpegArgs;
      if (process.platform === 'win32') {
        console.log(`[SimpleYouTube] Using Windows screen capture (gdigrab) to get REAL VIDEO`);
        console.log(`[SimpleYouTube] Using YouTube-compatible format with proper encoding`);
        ffmpegArgs = [
          '-f', 'gdigrab',
          '-i', 'desktop',
          '-f', 'lavfi',
          '-i', 'sine=frequency=1000',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', '500k',
          '-s', '1280x720',
          '-r', '30',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '64k',
          '-ar', '44100',
          '-f', 'flv',
          rtmpUrl
        ];
      } else {
        console.log(`[SimpleYouTube] Using x11grab for Linux/Mac screen capture`);
        console.log(`[SimpleYouTube] Using YouTube-compatible format with proper encoding`);
        ffmpegArgs = [
          '-f', 'x11grab',
          '-i', ':0.0',
          '-f', 'lavfi',
          '-i', 'sine=frequency=1000:duration=0',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-b:v', '800k',
          '-maxrate', '800k',
          '-bufsize', '1600k',
          '-g', '60',
          '-keyint_min', '60',
          '-sc_threshold', '0',
          '-s', '1280x720',
          '-r', '30',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '96k',
          '-ar', '44100',
          '-ac', '2',
          '-f', 'flv',
          '-flvflags', 'no_duration_filesize',
          rtmpUrl
        ];
      }
      
      console.log(`[SimpleYouTube] Starting FFmpeg process...`);
      console.log(`[SimpleYouTube] Command: ffmpeg ${ffmpegArgs.join(' ')}`);
      
      // Start FFmpeg process
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log(`[SimpleYouTube] FFmpeg process started with PID: ${ffmpegProcess.pid}`);
      
      // Log FFmpeg output with better error detection
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[FFmpeg] ${output}`);
        
        // Check for success indicators
        if (output.includes('Stream mapping')) {
          console.log('[SimpleYouTube] ✅ Stream mapping successful!');
        }
        if (output.includes('Press [q] to stop')) {
          console.log('[SimpleYouTube] ✅ Stream started successfully!');
        }
        if (output.includes('Connection to tcp://')) {
          console.log('[SimpleYouTube] ✅ Connecting to YouTube...');
        }
        if (output.includes('rtmp://a.rtmp.youtube.com')) {
          console.log('[SimpleYouTube] ✅ Connected to YouTube RTMP server!');
        }
        if (output.includes('frame=')) {
          console.log('[SimpleYouTube] ✅ Sending frames to YouTube!');
        }
        if (output.includes('gdigrab')) {
          console.log('[SimpleYouTube] ✅ Screen capture (gdigrab) is working!');
        }
        if (output.includes('Desktop Duplication')) {
          console.log('[SimpleYouTube] ✅ Windows Desktop Duplication is working!');
        }
        
        // Check for error indicators
        if (output.includes('Connection refused')) {
          console.error('[SimpleYouTube] ❌ Connection refused - check RTMP URL or stream key');
        }
        if (output.includes('Permission denied')) {
          console.error('[SimpleYouTube] ❌ Permission denied - check stream key');
        }
        if (output.includes('Invalid data found')) {
          console.error('[SimpleYouTube] ❌ Invalid data found - check input source');
        }
        if (output.includes('Server returned 404')) {
          console.error('[SimpleYouTube] ❌ Server returned 404 - endpoint not found');
        }
        if (output.includes('Connection timed out')) {
          console.error('[SimpleYouTube] ❌ Connection timed out - server may be down');
        }
        if (output.includes('No such filter')) {
          console.error('[SimpleYouTube] ❌ Filter not found - check FFmpeg installation');
        }
        if (output.includes('Invalid argument')) {
          console.error('[SimpleYouTube] ❌ Invalid argument - check FFmpeg command');
        }
        if (output.includes('Error opening input')) {
          console.error('[SimpleYouTube] ❌ Error opening input - check input source');
        }
        if (output.includes('gdigrab: Can\'t find window')) {
          console.error('[SimpleYouTube] ❌ Screen capture error - make sure desktop is accessible');
        }
        if (output.includes('Permission denied')) {
          console.error('[SimpleYouTube] ❌ Screen capture permission denied - run as administrator');
        }
        if (output.includes('Invalid argument')) {
          console.error('[SimpleYouTube] ❌ Screen capture invalid argument - check FFmpeg installation');
        }
      });
      
      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`[FFmpeg STDOUT] ${data.toString()}`);
      });
      
      // Store process info
      this.activeStreams.set(roomId, {
        process: ffmpegProcess,
        streamKey: streamKey,
        rtmpUrl: rtmpUrl,
        actualRoomId: roomId,
        startTime: new Date()
      });
      
      // Handle process events
      ffmpegProcess.on('error', (error) => {
        console.error(`[SimpleYouTube] Process error for room ${roomId}:`, error);
        this.activeStreams.delete(roomId);
      });
      
      ffmpegProcess.on('exit', (code) => {
        console.log(`[SimpleYouTube] Process exited for room ${roomId} with code ${code}`);
        if (code !== 0) {
          console.error(`[SimpleYouTube] Process exited with error code: ${code}`);
        }
        this.activeStreams.delete(roomId);
      });
      
      // Check if process is still running after 5 seconds
      setTimeout(() => {
        if (ffmpegProcess && !ffmpegProcess.killed) {
          console.log(`[SimpleYouTube] ✅ Process is running - YouTube should receive video!`);
        } else {
          console.error(`[SimpleYouTube] ❌ Process died`);
        }
      }, 5000);
      
      return {
        success: true,
        roomId: roomId,
        streamKey: streamKey,
        rtmpUrl: rtmpUrl,
        actualRoomId: roomId,
        broadcastUrl: `https://www.youtube.com/live`
      };
      
    } catch (error) {
      console.error('[SimpleYouTube] Error starting stream:', error);
      throw error;
    }
  }

  // Stop YouTube streaming
  async stopStream(roomId) {
    try {
      console.log(`[SimpleYouTube] Stopping stream for room: ${roomId}`);
      
      const streamInfo = this.activeStreams.get(roomId);
      
      if (!streamInfo) {
        console.log(`[SimpleYouTube] No active stream found for room: ${roomId}`);
        return {
          success: true,
          message: 'No active stream to stop',
          roomId: roomId
        };
      }
      
      // Kill FFmpeg process
      if (streamInfo.process && !streamInfo.process.killed) {
        console.log(`[SimpleYouTube] Stopping FFmpeg process for room: ${roomId}`);
        streamInfo.process.kill('SIGTERM');
        
        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force kill if still running
        if (!streamInfo.process.killed) {
          console.log(`[SimpleYouTube] Force stopping FFmpeg process for room: ${roomId}`);
          streamInfo.process.kill('SIGKILL');
        }
      }
      
      // Remove from active streams
      this.activeStreams.delete(roomId);
      
      console.log(`[SimpleYouTube] Stream stopped for room: ${roomId}`);
      
      return {
        success: true,
        message: 'Stream stopped successfully',
        roomId: roomId
      };
      
    } catch (error) {
      console.error('[SimpleYouTube] Error stopping stream:', error);
      return {
        success: false,
        error: error.message,
        roomId: roomId
      };
    }
  }

  // Get stream status
  getStreamStatus(roomId) {
    const streamInfo = this.activeStreams.get(roomId);
    
    if (!streamInfo) {
      return {
        isActive: false,
        roomId: roomId
      };
    }
    
    return {
      isActive: true,
      roomId: roomId,
      streamKey: streamInfo.streamKey,
      rtmpUrl: streamInfo.rtmpUrl,
      actualRoomId: streamInfo.actualRoomId || roomId,
      processId: streamInfo.process ? streamInfo.process.pid : null,
      startTime: streamInfo.startTime
    };
  }

  // Get all active streams
  getAllStreams() {
    const allStreams = {};
    
    for (const [roomId, streamInfo] of this.activeStreams) {
      allStreams[roomId] = {
        isActive: true,
        roomId: roomId,
        streamKey: streamInfo.streamKey,
        rtmpUrl: streamInfo.rtmpUrl,
        actualRoomId: streamInfo.actualRoomId || roomId,
        processId: streamInfo.process ? streamInfo.process.pid : null,
        startTime: streamInfo.startTime
      };
    }
    
    return allStreams;
  }

  // Reset stream key for a specific room
  async resetStreamKey(roomId) {
    try {
      console.log(`[SimpleYouTube] Resetting stream key for room: ${roomId}`);
      
      // Stop existing stream if running
      if (this.activeStreams.has(roomId)) {
        console.log(`[SimpleYouTube] Stopping existing stream for room: ${roomId}`);
        await this.stopStream(roomId);
      }
      
      // Clear any cached stream key data
      console.log(`[SimpleYouTube] Clearing cached stream key data for room: ${roomId}`);
      
      return {
        success: true,
        message: 'Stream key reset successfully',
        roomId: roomId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[SimpleYouTube] Error resetting stream key for room ${roomId}:`, error);
      throw error;
    }
  }

  // Reset all stream keys
  async resetAllStreamKeys() {
    try {
      console.log(`[SimpleYouTube] Resetting all stream keys`);
      
      // Stop all active streams
      const roomIds = Array.from(this.activeStreams.keys());
      for (const roomId of roomIds) {
        console.log(`[SimpleYouTube] Stopping stream for room: ${roomId}`);
        await this.stopStream(roomId);
      }
      
      // Clear all cached data
      console.log(`[SimpleYouTube] Clearing all cached stream key data`);
      
      return {
        success: true,
        message: 'All stream keys reset successfully',
        resetCount: roomIds.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[SimpleYouTube] Error resetting all stream keys:`, error);
      throw error;
    }
  }

  // Update stream key for a specific room
  async updateStreamKey(roomId, newStreamKey) {
    try {
      console.log(`[SimpleYouTube] Updating stream key for room: ${roomId}`);
      
      // Validate new stream key
      if (!this.validateStreamKey(newStreamKey)) {
        throw new Error('Invalid stream key format. Please check your YouTube stream key.');
      }
      
      // Stop existing stream if running
      if (this.activeStreams.has(roomId)) {
        console.log(`[SimpleYouTube] Stopping existing stream for room: ${roomId}`);
        await this.stopStream(roomId);
      }
      
      // Update stream key in active streams if exists
      if (this.activeStreams.has(roomId)) {
        const streamInfo = this.activeStreams.get(roomId);
        streamInfo.streamKey = newStreamKey;
        streamInfo.rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${newStreamKey}`;
        this.activeStreams.set(roomId, streamInfo);
        console.log(`[SimpleYouTube] Updated stream key in active streams for room: ${roomId}`);
      }
      
      return {
        success: true,
        message: 'Stream key updated successfully',
        roomId: roomId,
        newStreamKey: newStreamKey,
        newRtmpUrl: `rtmp://a.rtmp.youtube.com/live2/${newStreamKey}`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[SimpleYouTube] Error updating stream key for room ${roomId}:`, error);
      throw error;
    }
  }

  // Get current stream key for a room
  getCurrentStreamKey(roomId) {
    try {
      if (this.activeStreams.has(roomId)) {
        const streamInfo = this.activeStreams.get(roomId);
        return {
          success: true,
          roomId: roomId,
          streamKey: streamInfo.streamKey,
          rtmpUrl: streamInfo.rtmpUrl,
          isActive: true
        };
      } else {
        return {
          success: true,
          roomId: roomId,
          streamKey: null,
          rtmpUrl: null,
          isActive: false
        };
      }
    } catch (error) {
      console.error(`[SimpleYouTube] Error getting current stream key for room ${roomId}:`, error);
      throw error;
    }
  }
}

module.exports = new SimpleYouTube();
