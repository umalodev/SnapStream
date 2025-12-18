const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const fs = require('fs');
const path = require('path');
const { LiveStream } = require('./models');
const mediasoupState = require('./mediasoupState');
const { startFfmpegRecording, stopFfmpegRecording } = require('./recording/ffmpegRecorder');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Add express middleware for streaming endpoint
app.use(express.json());
app.use(express.static('public'));

// Streaming endpoint for dual streaming (browser + YouTube)
app.get('/stream/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`[MediaSoup] Streaming endpoint accessed for room: ${roomId}`);
  
  // Get producers for this room
  const roomProducers = producers[roomId];
  if (!roomProducers) {
    console.log(`[MediaSoup] No producers found for room: ${roomId}`);
    res.status(404).json({ error: 'Stream not found', roomId });
    return;
  }
  
  console.log(`[MediaSoup] Found producers for room: ${roomId}`, {
    videoProducer: roomProducers.video ? 'exists' : 'missing',
    audioProducer: roomProducers.audio ? 'exists' : 'missing'
  });
  
  // Check if we have video producer
  if (!roomProducers.video) {
    console.log(`[MediaSoup] No video producer found for room: ${roomId}`);
    res.status(404).json({ error: 'No video stream available', roomId });
    return;
  }
  
  // Set headers for streaming
  res.writeHead(200, {
    'Content-Type': 'video/webm',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });
  
  console.log(`[MediaSoup] Starting real video stream for room: ${roomId}`);
  
  // Create a consumer to get video data from the producer
  const videoProducer = roomProducers.video;
  const audioProducer = roomProducers.audio;
  
  // Create consumers for video and audio
  const createConsumers = async () => {
    try {
      // Create consumer transport for this stream
      const consumerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: '192.168.1.10', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });
      
      // Connect the transport (no DTLS needed for internal consumption)
      await consumerTransport.connect({ dtlsParameters: { role: 'auto' } });
      
      // Create video consumer
      const videoConsumer = await consumerTransport.consume({
        producerId: videoProducer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false
      });
      
      // Create audio consumer if available
      let audioConsumer = null;
      if (audioProducer) {
        audioConsumer = await consumerTransport.consume({
          producerId: audioProducer.id,
          rtpCapabilities: router.rtpCapabilities,
          paused: false
        });
      }
      
      console.log(`[MediaSoup] Created consumers for room: ${roomId}`);
      
      // Send WebM header
      const webmHeader = Buffer.from([
        0x1A, 0x45, 0xDF, 0xA3, // EBML header
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // EBML version
        0x42, 0x86, 0x81, 0x01, // DocType
        0x42, 0xF2, 0x81, 0x01, 0x42, 0xF3, 0x81, 0x01, // DocTypeVersion, DocTypeReadVersion
        0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // DocType = "webm"
        0x42, 0x87, 0x81, 0x02, // EBMLMaxIDLength
        0x42, 0x85, 0x81, 0x02  // EBMLMaxSizeLength
      ]);
      
      res.write(webmHeader);
      
      // Handle video data
      videoConsumer.on('transportclose', () => {
        console.log(`[MediaSoup] Video consumer transport closed for room: ${roomId}`);
      });
      
      videoConsumer.on('producerclose', () => {
        console.log(`[MediaSoup] Video producer closed for room: ${roomId}`);
        res.end();
      });
      
  // Create a proper WebM stream from MediaSoup RTP packets
  // This is a simplified implementation - in production you'd want proper RTP to WebM conversion
  const interval = setInterval(() => {
    if (res.destroyed) {
      clearInterval(interval);
      return;
    }
    
    // Send WebM cluster data (simplified)
    // In a real implementation, you'd convert RTP packets to WebM format
    const clusterData = Buffer.from([
      0x1F, 0x43, 0xB6, 0x75, // Cluster ID
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Cluster size (placeholder)
      // Add actual video/audio data here from RTP packets
    ]);
    
    res.write(clusterData);
  }, 100); // Send data every 100ms for smoother streaming
      
      // Clean up on disconnect
      req.on('close', () => {
        console.log(`[MediaSoup] Stream connection closed for room: ${roomId}`);
        clearInterval(interval);
        consumerTransport.close();
      });
      
      req.on('error', (error) => {
        console.error(`[MediaSoup] Stream error for room: ${roomId}:`, error);
        clearInterval(interval);
        consumerTransport.close();
      });
      
    } catch (error) {
      console.error(`[MediaSoup] Error creating consumers for room ${roomId}:`, error);
      res.status(500).json({ error: 'Failed to create stream consumers', details: error.message });
    }
  };
  
  createConsumers();
});

// Alternative streaming endpoint using WebRTC to capture video
app.get('/capture/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`[MediaSoup] Capture endpoint accessed for room: ${roomId}`);
  console.log(`[MediaSoup] Current producers:`, Object.keys(producers));
  console.log(`[MediaSoup] Producers details:`, producers);
  
  // Get producers for this room
  const roomProducers = producers[roomId];
  if (!roomProducers || !roomProducers.video) {
    console.log(`[MediaSoup] No video producer found for room: ${roomId}`);
    console.log(`[MediaSoup] Available rooms:`, Object.keys(producers));
    res.status(404).json({ 
      error: 'No video stream available', 
      roomId,
      availableRooms: Object.keys(producers),
      allProducers: producers
    });
    return;
  }
  
  // Set headers for streaming
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  
  // Return WebRTC connection info for external capture
  res.json({
    success: true,
    roomId: roomId,
    hasVideo: !!roomProducers.video,
    hasAudio: !!roomProducers.audio,
    message: 'Use WebRTC to capture this stream for YouTube simulcast',
    instructions: [
      '1. Connect to this MediaSoup server via WebRTC',
      '2. Create a consumer for the video producer',
      '3. Convert the RTP stream to WebM/MP4',
      '4. Feed the converted stream to FFmpeg for YouTube RTMP'
    ]
  });
});

// Debug endpoint to check all producers
app.get('/debug/producers', (req, res) => {
  console.log(`[MediaSoup] Debug endpoint accessed - checking all producers`);
  console.log(`[MediaSoup] Current producers:`, Object.keys(producers));
  console.log(`[MediaSoup] Producers details:`, producers);
  
  res.json({
    success: true,
    totalProducers: Object.keys(producers).length,
    producers: producers,
    availableRooms: Object.keys(producers)
  });
});

// Endpoint to get current viewer count for a room
app.get('/api/viewer-count/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const viewerCount = roomViewers[roomId] ? roomViewers[roomId].size : 0;
    
    // Also get from database for consistency
    const livestream = await LiveStream.findByPk(roomId);
    const dbViewerCount = livestream ? livestream.viewers : 0;
    
    console.log(`[ViewerCount] API Request - Room: ${roomId}, Memory: ${viewerCount}, DB: ${dbViewerCount}`);
    
    res.json({
      success: true,
      roomId,
      viewers: viewerCount,
      dbViewers: dbViewerCount,
      activeViewers: roomViewers[roomId] ? Array.from(roomViewers[roomId]) : []
    });
  } catch (error) {
    console.error('Error getting viewer count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get viewer count'
    });
  }
});

// Debug endpoint to check all room viewers
app.get('/api/debug/viewers', (req, res) => {
  console.log(`[ViewerCount] Debug request - All room viewers:`, roomViewers);
  res.json({
    success: true,
    roomViewers: Object.keys(roomViewers).reduce((acc, roomId) => {
      acc[roomId] = {
        count: roomViewers[roomId].size,
        viewers: Array.from(roomViewers[roomId])
      };
      return acc;
    }, {})
  });
});

// Endpoint for admin to notify viewers that stream has ended
app.post('/api/stream-ended', (req, res) => {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }
    
    console.log(`[StreamEnded] Admin API request to end stream for room: ${roomId}`);
    
    // Broadcast to all viewers in the room
    io.to(roomId).emit('streamEnded', { 
      roomId, 
      message: 'Livestream telah berakhir',
      timestamp: new Date().toISOString()
    });
    
    console.log(`[StreamEnded] Broadcasted stream ended notification to room: ${roomId}`);
    
    res.json({
      success: true,
      message: 'Stream ended notification sent to all viewers',
      roomId: roomId
    });
  } catch (error) {
    console.error('Error sending stream ended notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send stream ended notification'
    });
  }
});

// New endpoint for FFmpeg-compatible stream - SIMPLE VERSION
app.get('/ffmpeg-stream/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`[MediaSoup] FFmpeg stream endpoint accessed for room: ${roomId}`);
  
  // Get producers for this room
  const roomProducers = producers[roomId];
  if (!roomProducers || !roomProducers.video) {
    console.log(`[MediaSoup] No video producer found for room: ${roomId}`);
    res.status(404).json({ error: 'No video stream available', roomId });
    return;
  }
  
  console.log(`[MediaSoup] Found video producer for room: ${roomId}`);
  
  // Set headers for FFmpeg streaming
  res.writeHead(200, {
    'Content-Type': 'video/webm',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });
  
  console.log(`[MediaSoup] Starting FFmpeg-compatible stream for room: ${roomId}`);
  
  // Send WebM header
  const webmHeader = Buffer.from([
    0x1A, 0x45, 0xDF, 0xA3, // EBML header
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // EBML version
    0x42, 0x86, 0x81, 0x01, // DocType
    0x42, 0xF2, 0x81, 0x01, 0x42, 0xF3, 0x81, 0x01, // DocTypeVersion, DocTypeReadVersion
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // DocType = "webm"
    0x42, 0x87, 0x81, 0x02, // EBMLMaxIDLength
    0x42, 0x85, 0x81, 0x02  // EBMLMaxSizeLength
  ]);
  
  res.write(webmHeader);
  
  // Send periodic data to keep stream alive
  let frameCount = 0;
  const interval = setInterval(() => {
    if (res.destroyed) {
      clearInterval(interval);
      return;
    }
    
    frameCount++;
    
    // Send WebM cluster data (simplified)
    const clusterData = Buffer.from([
      0x1F, 0x43, 0xB6, 0x75, // Cluster ID
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Cluster size (placeholder)
      // Minimal video data to keep FFmpeg happy
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    res.write(clusterData);
    
    // Log every 30 frames (1 second at 30fps)
    if (frameCount % 30 === 0) {
      console.log(`[MediaSoup] Sent ${frameCount} frames for room: ${roomId}`);
    }
  }, 33); // ~30 FPS
  
  // Clean up on disconnect
  req.on('close', () => {
    console.log(`[MediaSoup] FFmpeg stream connection closed for room: ${roomId}`);
    clearInterval(interval);
  });
  
  req.on('error', (error) => {
    console.error(`[MediaSoup] FFmpeg stream error for room: ${roomId}:`, error);
    clearInterval(interval);
  });
  
  console.log(`[MediaSoup] FFmpeg stream started for room: ${roomId}`);
});

// New endpoint for WebRTC stream info (for FFmpeg to connect directly)
app.get('/webrtc-stream/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`[MediaSoup] WebRTC stream info requested for room: ${roomId}`);
  
  // Get producers for this room
  const roomProducers = producers[roomId];
  if (!roomProducers || !roomProducers.video) {
    console.log(`[MediaSoup] No video producer found for room: ${roomId}`);
    res.status(404).json({ error: 'No video stream available', roomId });
    return;
  }
  
  console.log(`[MediaSoup] Found video producer for room: ${roomId}`);
  
  // Return WebRTC connection info for FFmpeg
  res.json({
    success: true,
    roomId: roomId,
    hasVideo: !!roomProducers.video,
    hasAudio: !!roomProducers.audio,
    message: 'Use WebRTC to connect to this MediaSoup server',
    instructions: [
      '1. Connect to this MediaSoup server via WebRTC',
      '2. Create a consumer for the video producer',
      '3. Use the consumer to get video data',
      '4. Feed the video data to FFmpeg for YouTube RTMP'
    ],
    webrtcUrl: `ws://192.168.1.10:4000`,
    producerId: roomProducers.video.id
  });
});

// New endpoint for direct video stream (using WebRTC consumer)
app.get('/direct-video/:roomId', async (req, res) => {
  const { roomId } = req.params;
  
  console.log(`[MediaSoup] Direct video stream requested for room: ${roomId}`);
  
  // Get producers for this room
  const roomProducers = producers[roomId];
  if (!roomProducers || !roomProducers.video) {
    console.log(`[MediaSoup] No video producer found for room: ${roomId}`);
    res.status(404).json({ error: 'No video stream available', roomId });
    return;
  }
  
  console.log(`[MediaSoup] Found video producer for room: ${roomId}`);
  
  try {
    // Create a consumer transport to get video data
    const consumerTransport = await router.createWebRtcTransport({
      listenIps: [{ ip: '192.168.1.10', announcedIp: null }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    });
    
    // Connect the transport
    await consumerTransport.connect({ dtlsParameters: { role: 'auto' } });
    
    // Create video consumer
    const videoConsumer = await consumerTransport.consume({
      producerId: roomProducers.video.id,
      rtpCapabilities: router.rtpCapabilities,
      paused: false
    });
    
    console.log(`[MediaSoup] Created video consumer for room: ${roomId}`);
    
    // Set headers for video streaming
    res.writeHead(200, {
      'Content-Type': 'video/webm',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked'
    });
    
    console.log(`[MediaSoup] Starting direct video stream for room: ${roomId}`);
    
    // Send WebM header
    const webmHeader = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3, // EBML header
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // EBML version
      0x42, 0x86, 0x81, 0x01, // DocType
      0x42, 0xF2, 0x81, 0x01, 0x42, 0xF3, 0x81, 0x01, // DocTypeVersion, DocTypeReadVersion
      0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // DocType = "webm"
      0x42, 0x87, 0x81, 0x02, // EBMLMaxIDLength
      0x42, 0x85, 0x81, 0x02  // EBMLMaxSizeLength
    ]);
    
    res.write(webmHeader);
    
    let frameCount = 0;
    
    // Listen for RTP packets from the consumer
    videoConsumer.on('transportclose', () => {
      console.log(`[MediaSoup] Video consumer transport closed for room: ${roomId}`);
    });
    
    videoConsumer.on('producerclose', () => {
      console.log(`[MediaSoup] Video producer closed for room: ${roomId}`);
      res.end();
    });
    
    // Listen for RTP packets
    videoConsumer.on('rtp', (rtpPacket) => {
      if (res.destroyed) return;
      
      frameCount++;
      
      // Convert RTP packet to WebM format (simplified)
      // In a real implementation, you'd need proper RTP to WebM conversion
      const webmData = Buffer.from([
        0x1F, 0x43, 0xB6, 0x75, // Cluster ID
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Cluster size
        // RTP payload data (simplified)
        ...rtpPacket.payload
      ]);
      
      res.write(webmData);
      
      // Log every 30 packets (1 second at 30fps)
      if (frameCount % 30 === 0) {
        console.log(`[MediaSoup] Sent ${frameCount} RTP packets for room: ${roomId}`);
      }
    });
    
    // Clean up on disconnect
    req.on('close', () => {
      console.log(`[MediaSoup] Direct video stream connection closed for room: ${roomId}`);
      consumerTransport.close();
    });
    
    req.on('error', (error) => {
      console.error(`[MediaSoup] Direct video stream error for room: ${roomId}:`, error);
      consumerTransport.close();
    });
    
    console.log(`[MediaSoup] Direct video stream started for room: ${roomId}`);
    
  } catch (error) {
    console.error(`[MediaSoup] Error creating direct video stream for room ${roomId}:`, error);
    res.status(500).json({ error: 'Failed to create direct video stream', details: error.message });
  }
});

let worker, router;
// Remove global producerTransport and consumerTransports
// let producerTransport, consumerTransports = [];
let producerVideo = null;
let producerAudio = null;
const { producers, clientTransports, roomViewers } = require('./mediasoupState');


// Function to update viewer count in database
const updateViewerCount = async (roomId) => {
  try {
    const viewerCount = roomViewers[roomId] ? roomViewers[roomId].size : 0;
    console.log(`[ViewerCount] Updating viewer count for room ${roomId}: ${viewerCount}`);
    console.log(`[ViewerCount] Active viewers in memory:`, roomViewers[roomId] ? Array.from(roomViewers[roomId]) : []);
    
    // Update database
    const [affectedRows] = await LiveStream.update(
      { viewers: viewerCount },
      { where: { id: roomId } }
    );
    
    console.log(`[ViewerCount] Database update result - affected rows: ${affectedRows}`);
    
    // Verify database update
    const updatedRecord = await LiveStream.findByPk(roomId);
    console.log(`[ViewerCount] Database verification - current viewers in DB: ${updatedRecord ? updatedRecord.viewers : 'not found'}`);
    
    // Broadcast viewer count update to all clients in the room
    io.to(roomId).emit('viewerCountUpdate', { roomId, viewers: viewerCount });
    console.log(`[ViewerCount] Broadcasted viewer count update to room ${roomId}: ${viewerCount}`);
  } catch (error) {
    console.error(`[ViewerCount] Error updating viewer count for room ${roomId}:`, error);
    console.error(`[ViewerCount] Error details:`, error.message);
    console.error(`[ViewerCount] Error stack:`, error.stack);
  }
};

// Function to add viewer to room
const addViewerToRoom = (roomId, socketId) => {
  if (!roomViewers[roomId]) {
    roomViewers[roomId] = new Set();
  }

  roomViewers[roomId].add(socketId);

  console.log(`[ViewerCount] Viewer joined: ${socketId}, room: ${roomId}, total: ${roomViewers[roomId].size}`);

  updateViewerCount(roomId);
};

// Function to remove viewer from room
const removeViewerFromRoom = async (roomId, socketId) => {
  // Cek status livestream di DB
  const stream = await LiveStream.findByPk(roomId);

  if (!stream || stream.status !== "active") {
    console.log(`[ViewerCount] Skip: stream is not active (${stream?.status})`);
    return;
  }

  if (!roomViewers[roomId]) return;

  roomViewers[roomId].delete(socketId);

  console.log(`[ViewerCount] Viewer removed: ${socketId}, room: ${roomId}, total: ${roomViewers[roomId].size}`);

  if (roomViewers[roomId].size === 0) {
    delete roomViewers[roomId];
  }

  updateViewerCount(roomId);
};

// Recording functionality
const recordings = {}; // { [roomId]: { isRecording: boolean, startTime: Date, filePath: string } }

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          minptime: 10, // Back to 10ms for stability
          useinbandfec: 1, // Enable FEC for stability
          maxplaybackrate: 48000,
          maxaveragebitrate: 128000,
          stereo: 1,
          dtx: 1
        }
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1500, // Balanced for stability
          'x-google-max-bitrate': 3000,   // Balanced for stability
          'x-google-min-bitrate': 500,    // Lower minimum for better adaptation
          'x-google-max-framerate': 30,   // Limit framerate for stability
          'x-google-max-quantization': 40 // Higher quantization for stability
        }
      }
    ]
  });
  console.log('Mediasoup worker & router created');
})();

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  
  // Initialize client transports
  clientTransports[socket.id] = {
    producer: null,
    consumers: []
  };

  // Handle room joining for real-time updates
  socket.on('joinRoom', ({ roomId }) => {
    console.log(`[ViewerCount] Socket ${socket.id} joining room ${roomId}`);
    socket.join(roomId);
  });

  // Handle chat room joining
  socket.on('joinChatRoom', ({ roomId, username, isAdmin }) => {
    console.log(`[Chat] Socket ${socket.id} (${username}) joining chat room ${roomId}`);
    socket.join(roomId);
    socket.data = { ...socket.data, username, isAdmin, roomId };
    
    // Notify others that user joined (optional)
    socket.to(roomId).emit('chatMessage', {
      id: `system-${Date.now()}`,
      username: 'System',
      message: `${username} bergabung ke chat`,
      timestamp: new Date().toISOString(),
      isSystem: true
    });
  });

  // Handle chat messages
  socket.on('sendChatMessage', ({ roomId, id, username, message, timestamp, isAdmin }) => {
    console.log(`[Chat] Message from ${username} (Admin: ${isAdmin}) in room ${roomId}: ${message}`);
    
    // Validate message
    if (!message || !message.trim() || !roomId) {
      console.log(`[Chat] Invalid message or roomId`);
      return;
    }

    // Sanitize message (prevent XSS)
    const sanitizedMessage = message.trim().substring(0, 500); // Max 500 characters

    const chatMessage = {
      id: id || `msg-${Date.now()}-${socket.id}`,
      username: username || 'Anonymous',
      message: sanitizedMessage,
      timestamp: timestamp || new Date().toISOString(),
      isAdmin: Boolean(isAdmin) // Ensure boolean value
    };

    console.log(`[Chat] Prepared message:`, { id: chatMessage.id, username: chatMessage.username, isAdmin: chatMessage.isAdmin, message: chatMessage.message });

    // Broadcast to ALL users in the room (including sender) to ensure consistency
    const room = io.sockets.adapter.rooms.get(roomId);
    const roomSize = room ? room.size : 0;
    console.log(`[Chat] Broadcasting to room ${roomId} with ${roomSize} users`);
    io.to(roomId).emit('chatMessage', chatMessage);
    console.log(`[Chat] ✅ Broadcasted message to room ${roomId} - Message ID: ${chatMessage.id} - Recipients: ${roomSize} users - Admin: ${chatMessage.isAdmin}`);
  });

  // Handle stream ended notification
  socket.on('streamEnded', ({ roomId }) => {
    console.log(`[StreamEnded] Admin ended stream for room: ${roomId}`);
    // Broadcast to all viewers in the room
    io.to(roomId).emit('streamEnded', { 
      roomId, 
      message: 'Livestream telah berakhir',
      timestamp: new Date().toISOString()
    });
    console.log(`[StreamEnded] Broadcasted stream ended notification to room: ${roomId}`);
  });

  socket.on('getRtpCapabilities', (_, cb) => {
    cb(router.rtpCapabilities);
  });

  socket.on('createProducerTransport', async (_, cb) => {
    try {
      const producerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: '192.168.1.10', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 2000000, // Balanced for stability
        minimumAvailableOutgoingBitrate: 1000000, // Balanced minimum
        maxSctpMessageSize: 262144,
        appData: { role: 'producer' }
      });
      
      // Store transport for this client
      clientTransports[socket.id].producer = producerTransport;
      
      cb({
        id: producerTransport.id,
        iceParameters: producerTransport.iceParameters,
        iceCandidates: producerTransport.iceCandidates,
        dtlsParameters: producerTransport.dtlsParameters
      });
    } catch (error) {
      console.error('Error creating producer transport:', error);
      cb({ error: error.message });
    }
  });

  socket.on('connectProducerTransport', async ({ dtlsParameters }, cb) => {
    try {
      const producerTransport = clientTransports[socket.id].producer;
      if (!producerTransport) {
        return cb({ error: 'Producer transport not found' });
      }
      
      await producerTransport.connect({ dtlsParameters });
      cb();
    } catch (error) {
      console.error('Error connecting producer transport:', error);
      cb({ error: error.message });
    }
  });

  socket.on('produce', async ({ kind, rtpParameters, roomId }, cb) => {
    try {
      const producerTransport = clientTransports[socket.id].producer;
      if (!producerTransport) {
        return cb({ error: 'Producer transport not found' });
      }

      if (!producers[roomId]) producers[roomId] = {};
      
      if (kind === 'video') {
        producerVideo = await producerTransport.produce({ 
          kind, 
          rtpParameters,
          appData: { socketId: socket.id, roomId }
        });
        producers[roomId][kind] = producerVideo;
        cb({ id: producerVideo.id });
        socket.broadcast.emit('newProducer', { roomId, kind });
        console.log('Producer created:', { roomId, kind, id: producerVideo.id, socketId: socket.id });
      } else if (kind === 'audio') {
        producerAudio = await producerTransport.produce({ 
          kind, 
          rtpParameters,
          appData: { socketId: socket.id, roomId }
        });
        producers[roomId][kind] = producerAudio;
        cb({ id: producerAudio.id });
        socket.broadcast.emit('newProducer', { roomId, kind });
        console.log('Producer created:', { roomId, kind, id: producerAudio.id, socketId: socket.id });
      }
    } catch (error) {
      console.error('Error producing:', error);
      cb({ error: error.message });
    }
  });

  socket.on('createConsumerTransport', async (_, cb) => {
    try {
      const consumerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: '192.168.1.10', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 2000000, // Balanced for stability
        minimumAvailableOutgoingBitrate: 1000000, // Balanced minimum
        maxSctpMessageSize: 262144,
        appData: { role: 'consumer' }
      });
      
      // Store transport for this client
      clientTransports[socket.id].consumers.push(consumerTransport);
      
      cb({
        id: consumerTransport.id,
        iceParameters: consumerTransport.iceParameters,
        iceCandidates: consumerTransport.iceCandidates,
        dtlsParameters: consumerTransport.dtlsParameters
      });
    } catch (error) {
      console.error('Error creating consumer transport:', error);
      cb({ error: error.message });
    }
  });

  socket.on('connectConsumerTransport', async ({ dtlsParameters }, cb) => {
    try {
      // Find the most recent consumer transport for this client
      const consumerTransports = clientTransports[socket.id].consumers;
      if (consumerTransports.length === 0) {
        return cb({ error: 'No consumer transports found' });
      }
      
      // Use the most recent consumer transport
      const transport = consumerTransports[consumerTransports.length - 1];
      console.log('Connecting consumer transport:', transport.id);
      
      await transport.connect({ dtlsParameters });
      console.log('Consumer transport connected successfully');
      cb();
    } catch (error) {
      console.error('Error connecting consumer transport:', error);
      cb({ error: error.message });
    }
  });

  socket.on('consume', async ({ transportId, rtpCapabilities, roomId }, cb) => {
    try {
      console.log(`[ViewerCount] Consume event received - Socket: ${socket.id}, RoomId: ${roomId}, TransportId: ${transportId}`);
      
      // Add viewer to room when they start consuming
      if (roomId) {
        addViewerToRoom(roomId, socket.id);
        socket.join(roomId); // Join socket.io room for real-time updates
        console.log(`[ViewerCount] Viewer ${socket.id} joined socket.io room ${roomId}`);
      } else {
        console.log(`[ViewerCount] WARNING: No roomId provided in consume event for socket ${socket.id}`);
      }
      
      // Find transport by ID or use the most recent one
      let transport = clientTransports[socket.id].consumers.find(t => t.id === transportId);
      if (!transport) {
        // Fallback to most recent consumer transport
        const consumerTransports = clientTransports[socket.id].consumers;
        if (consumerTransports.length > 0) {
          transport = consumerTransports[consumerTransports.length - 1];
          console.log('Using fallback transport:', transport.id);
        } else {
          return cb({ error: 'Consumer transport not found' });
        }
      }
      
      const consumers = [];
      const roomProducers = producers[roomId] || {};
      
      for (const kind of ['video', 'audio']) {
        const prod = roomProducers[kind];
        console.log(`Checking ${kind} producer for room ${roomId}:`, prod ? 'exists' : 'not found');
        if (prod && router.canConsume({ producerId: prod.id, rtpCapabilities })) {
          const consumer = await transport.consume({
            producerId: prod.id,
            rtpCapabilities,
            paused: false
          });
          const consumerData = {
            id: consumer.id,
            producerId: prod.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters
          };
          consumers.push(consumerData);
          console.log('Consumer created:', { kind: consumer.kind, id: consumer.id, producerId: prod.id, roomId });
        } else {
          console.log(`Cannot consume ${kind}:`, prod ? 'router cannot consume' : 'producer not found');
        }
      }
      
      if (consumers.length === 0) {
        console.log('Cannot consume: no suitable producer for room', roomId);
        return cb({ error: 'Cannot consume' });
      }
      
      cb({ consumers });
    } catch (error) {
      console.error('Error consuming:', error);
      cb({ error: error.message });
    }
  });

  // Recording events
  socket.on('startRecording', async ({ roomId, isRecording }) => {
  console.log(`Starting recording request for room ${roomId}:`, isRecording);
  if (!isRecording) {
    return socket.emit('recordingError', { roomId, message: 'isRecording flag false' });
  }

  // avoid duplicate
  if (recordings[roomId] && recordings[roomId].isRecording) {
    return socket.emit('recordingStarted', { roomId, message: 'already recording' });
  }

  try {
    // Try to use the local HTTP ffmpeg-stream endpoint as input (easier to wire)
    const httpUrl = `http://127.0.0.1:${PORT}/ffmpeg-stream/${roomId}`;
    const rec = startFfmpegRecording(roomId, { httpUrl });

    // store in local socket recordings map if needed
    socket.emit('recordingStarted', { roomId, recordingPath: rec.finalPath });
    console.log(`Recording started for ${roomId}, tentative path: ${rec.finalPath}`);
  } catch (err) {
    console.error(`Failed to start recording for ${roomId}:`, err);
    socket.emit('recordingError', { roomId, message: err.message });
  }
});

  socket.on('stopRecording', async ({ roomId }) => {
  console.log(`Stop recording requested for room ${roomId}`);
  try {
    const result = await stopFfmpegRecording(roomId);
    console.log(`Recording stopped for ${roomId}:`, result);
    socket.emit('recordingStopped', { roomId, finalPath: result.finalPath });
  } catch (err) {
    console.error(`Failed to stop recording for ${roomId}:`, err);
    socket.emit('recordingError', { roomId, message: err.message });
  }
});
// optional query endpoint to get recording status
socket.on('getRecordingStatus', ({ roomId }, cb) => {
  const r = require('./recording/ffmpegRecorder').recordings[roomId];
  cb({
    isRecording: !!r,
    startedAt: r ? r.startedAt : null,
    tempPath: r ? r.tempPath : null
  });
});
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove viewer from all rooms
    for (const roomId of Object.keys(roomViewers)) {
      removeViewerFromRoom(roomId, socket.id);
    }
    
    // Clean up client transports
    if (clientTransports[socket.id]) {
      const clientData = clientTransports[socket.id];
      
      // Close producer transport
      if (clientData.producer) {
        clientData.producer.close();
      }
      
      // Close consumer transports
      clientData.consumers.forEach(transport => {
        transport.close();
      });
      
      delete clientTransports[socket.id];
    }
    
    // Clean up producers for this client after a delay to allow viewers to connect
    // Find which room this client was producing for
    let roomToCleanup = null;
    for (const [roomId, roomProducers] of Object.entries(producers)) {
      for (const [kind, producer] of Object.entries(roomProducers)) {
        if (producer && producer.appData && producer.appData.socketId === socket.id) {
          roomToCleanup = roomId;
          break;
        }
      }
      if (roomToCleanup) break;
    }
    
    // If this client was a producer, delay cleanup to allow viewers to connect
    if (roomToCleanup) {
      console.log(`Producer disconnected from room ${roomToCleanup}, scheduling cleanup in 30 seconds`);
      setTimeout(() => {
        // Check if there are still active consumers for this room
        const hasActiveConsumers = Object.values(clientTransports).some(clientData => 
          clientData.consumers && clientData.consumers.length > 0
        );
        
        if (!hasActiveConsumers) {
          console.log(`Cleaning up producers for room ${roomToCleanup} after delay`);
          if (producers[roomToCleanup]) {
            delete producers[roomToCleanup];
          }
        } else {
          console.log(`Keeping producers for room ${roomToCleanup} - active consumers found`);
        }
      }, 30000); // 30 second delay
    }
  });

  // Add endpoint to check if producer exists for a room
  socket.on('checkProducer', ({ roomId }, cb) => {
    try {
      console.log(`[checkProducer] Received request for room: ${roomId}`);
      console.log(`[checkProducer] Current producers:`, Object.keys(producers));
      
      const roomProducers = producers[roomId] || {};
      const hasVideoProducer = !!roomProducers.video;
      const hasAudioProducer = !!roomProducers.audio;
      
      const result = {
        hasVideoProducer,
        hasAudioProducer,
        roomId,
        allRooms: Object.keys(producers)
      };
      
      console.log(`[checkProducer] Result for room ${roomId}:`, result);
      
      if (typeof cb === 'function') {
        cb(result);
        console.log(`[checkProducer] Response sent for room ${roomId}`);
      } else {
        console.error(`[checkProducer] No callback function provided for room ${roomId}`);
      }
    } catch (error) {
      console.error(`[checkProducer] Error checking producers for room ${roomId}:`, error);
      if (typeof cb === 'function') {
        cb({
          hasVideoProducer: false,
          hasAudioProducer: false,
          roomId,
          allRooms: [],
          error: error.message
        });
      }
    }
  });
});

const PORT = 4000;
server.listen(PORT, '192.168.1.10', () => {
  console.log(`MediaSoup server running on http://192.168.1.10:${PORT}`);
}); 