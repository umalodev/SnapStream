// backend/controller/liveStreamController.js
const { LiveStream } = require('../models');
const path = require('path');
const fs = require('fs');
const { roomViewers } = require('../mediasoupState');
const multer = require('multer');
const { Op } = require('sequelize');
const { spawn } = require('child_process');

/// =====================
// MULTER CONFIG FIXED
// =====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;

    const safeName =
      originalName && originalName.trim() !== ""
        ? originalName
        : `stream_${Date.now()}.webm`;

    cb(null, safeName);
  }
});

const upload = multer({ storage }); // <-- HARUS instance, tanpa .single()
exports.uploadRecordingMiddleware = upload.single('recording'); // <-- Baru call single()


// Kalau mau dipakai di routes:
// module.exports.uploadRecordingMiddleware = upload.single('recording');

let liveStreams = [];
let streamingStats = {
  totalStreams: 0,
  totalDuration: 0,
  totalViewers: 0,
  activeStreams: 0,
  averageViewers: 0,
  streamHistory: []
};

exports.startLive = async (req, res) => {
  const { id, title } = req.body;

  try {
    console.log('Starting live stream with data:', { id, title });

    if (!id) {
      console.log('Stream ID is missing');
      return res.status(400).json({
        error: 'Stream ID is required',
        success: false
      });
    }

    const existingStream = await LiveStream.findOne({
      where: { id: id }
    });
    console.log('Existing stream found:', existingStream ? 'Yes' : 'No');

    if (existingStream) {
      return res.status(400).json({
        error: 'Live stream with this ID already exists',
        success: false
      });
    }

    const existingInMemory = liveStreams.find(s => s.id === id);
    console.log('Existing in memory:', existingInMemory ? 'Yes' : 'No');

    if (!existingInMemory) {
      const newStream = {
        id,
title: title, // Tidak ada fallback
        startTime: new Date().toISOString(),
        viewers: 0,
        isRecording: false
      };
      liveStreams.push(newStream);

      console.log('Creating live stream record in database...');
      await LiveStream.create({
        id,
  title: title, // <= hanya judul dari user
        startTime: new Date(),
        viewers: 0,
        isRecording: false,
        status: 'active'
      });
      console.log('Live stream record created successfully');

      streamingStats.activeStreams = liveStreams.length;

      streamingStats.streamHistory.push({
        id,
        startTime: newStream.startTime,
        endTime: null,
        duration: 0,
        viewers: 0,
        isRecording: false
      });

      res.json({ success: true });
    } else {
      res.status(400).json({
        error: 'Live stream with this ID is already active',
        success: false
      });
    }
  } catch (error) {
    console.error('Error starting live stream:', error);
    res.status(500).json({
      error: 'Failed to start live stream',
      details: error.message,
      success: false
    });
  }
};

// ✅ PERBAIKAN 1: Fix viewers count saat stop live
exports.stopLive = async (req, res) => {
  const { id } = req.body;

  try {
    const streamToStop = liveStreams.find(s => s.id === id);
    const existingStream = await LiveStream.findByPk(id);

    if (!existingStream) {
      return res.status(404).json({ error: 'Live stream tidak ditemukan' });
    }

    if (existingStream.status !== 'active') {
      console.log(`⏹️ Stream ${id} already stopped earlier`);
      return res.json({ success: true, alreadyStopped: true });
    }

    const roomViewerCount = roomViewers[id] ? roomViewers[id].size : 0;
    const memoryViewerCount = streamToStop ? (streamToStop.viewers || 0) : 0;
    const dbViewerCount = existingStream.viewers || 0;

    const finalViewerCount = Math.max(
      roomViewerCount,
      memoryViewerCount,
      dbViewerCount
    );

    console.log(`📌 FINAL VIEWER COUNT for ${id}:`, {
      roomViewerCount,
      memoryViewerCount,
      dbViewerCount,
      finalViewerCount
    });

    const endTime = new Date();
    const startTime = streamToStop
      ? new Date(streamToStop.startTime)
      : new Date(existingStream.startTime);

    const durationHours = (endTime - startTime) / (1000 * 60 * 60);
    const hasRecording = !!existingStream.recordingPath;

    await LiveStream.update(
      {
        endTime,
        duration: durationHours,
        viewers: finalViewerCount,
        status: hasRecording ? 'recording' : 'ended',
      },
      { where: { id } }
    );

    console.log('✅ DB updated:', {
      id,
      finalViewerCount,
      status: hasRecording ? 'recording' : 'ended'
    });

    liveStreams = liveStreams.filter(s => s.id !== id);
    streamingStats.activeStreams = liveStreams.length;

    res.json({ success: true, viewers: finalViewerCount });
  } catch (error) {
    console.error('❌ Error stopping live stream:', error);
    res.status(500).json({
      error: 'Failed to stop live stream',
      details: error.message,
    });
  }
};

exports.getActive = (req, res) => {
  res.json(liveStreams);
};

exports.getStats = async (req, res) => {
  try {
    const totalStreamsFromDB = await LiveStream.count();

    const completedStreams = streamingStats.streamHistory.filter(h => h.endTime);
    const totalCompletedStreams = completedStreams.length;
    const totalDuration = streamingStats.totalDuration;
    const totalViewers = streamingStats.totalViewers;

    let averageViewers = 0;
    if (totalCompletedStreams > 0 && totalViewers > 0) {
      averageViewers = Math.round(totalViewers / totalCompletedStreams);
    }

    const stats = {
      totalStreams: totalStreamsFromDB,
      totalDuration: Math.round(totalDuration * 100) / 100,
      totalViewers: totalViewers,
      activeStreams: liveStreams.length,
      averageViewers: averageViewers
    };

    console.log(
      'Stats requested - Database count:',
      totalStreamsFromDB,
      'Memory count:',
      streamingStats.totalStreams
    );
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

exports.updateViewers = (req, res) => {
  const { id, viewers } = req.body;
  const stream = liveStreams.find(s => s.id === id);
  if (stream) {
    const oldViewers = stream.viewers || 0;
    stream.viewers = oldViewers + viewers;

    const historyEntry = streamingStats.streamHistory.find(
      h => h.id === id && !h.endTime
    );
    if (historyEntry) {
      historyEntry.viewers = stream.viewers;
    }

    console.log(`👥 Updated viewers for stream ${id}: ${oldViewers} → ${stream.viewers}`);
  }
  res.json({ success: true });
};

exports.getStreamInfo = (req, res) => {
  const { id } = req.params;
  const stream = liveStreams.find(s => s.id === id);

  if (stream) {
    const startTime = new Date(stream.startTime);
    const currentTime = new Date();
    const durationHours = (currentTime - startTime) / (1000 * 60 * 60);

    res.json({
      startTime: stream.startTime,
      viewers: stream.viewers || 0,
      duration: durationHours,
      streamId: stream.id,
      isRecording: stream.isRecording || false
    });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
};

exports.getCurrentStreamStats = (req, res) => {
  const { id } = req.params;
  const stream = liveStreams.find(s => s.id === id);

  if (stream) {
    const startTime = new Date(stream.startTime);
    const currentTime = new Date();
    const durationHours = (currentTime - startTime) / (1000 * 60 * 60);

    const stats = {
      totalStreams: 1,
      totalDuration: durationHours,
      totalViewers: stream.viewers || 0,
      activeStreams: 1,
      averageViewers: stream.viewers || 0
    };

    res.json(stats);
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
};

exports.resetStats = async (req, res) => {
  try {
    const totalStreamsFromDB = await LiveStream.count();

    streamingStats = {
      totalStreams: totalStreamsFromDB,
      totalDuration: 0,
      totalViewers: 0,
      activeStreams: 0,
      averageViewers: 0,
      streamHistory: []
    };

    console.log('Stats reset to match database:', {
      totalStreams: totalStreamsFromDB
    });
    res.json({
      success: true,
      message: 'Statistik berhasil direset',
      totalStreams: totalStreamsFromDB
    });
  } catch (error) {
    console.error('Error resetting stats:', error);
    res.status(500).json({ error: 'Failed to reset stats' });
  }
};

exports.syncStats = async (req, res) => {
  try {
    const totalStreamsFromDB = await LiveStream.count();

    streamingStats.totalStreams = totalStreamsFromDB;

    console.log('Stats synced with database:', {
      totalStreams: totalStreamsFromDB
    });
    res.json({
      success: true,
      message: 'Stats berhasil disinkronkan dengan database',
      totalStreams: totalStreamsFromDB
    });
  } catch (error) {
    console.error('Error syncing stats:', error);
    res.status(500).json({ error: 'Failed to sync stats' });
  }
};

const initializeDefaultStats = async () => {
  try {
    const totalStreamsFromDB = await LiveStream.count();
    streamingStats.totalStreams = totalStreamsFromDB;
    streamingStats.totalDuration = 0;
    streamingStats.totalViewers = 0;
    streamingStats.activeStreams = 0;
    streamingStats.averageViewers = 0;
    streamingStats.streamHistory = [];

    console.log('Stats initialized from database:', {
      totalStreams: totalStreamsFromDB
    });
  } catch (error) {
    console.error('Error initializing stats:', error);
    streamingStats.totalStreams = 0;
    streamingStats.totalDuration = 0;
    streamingStats.totalViewers = 0;
    streamingStats.activeStreams = 0;
    streamingStats.averageViewers = 0;
    streamingStats.streamHistory = [];
  }
};

setTimeout(() => {
  initializeDefaultStats();
}, 1000);

exports.getLiveStreamHistory = async (req, res) => {
  try {
    // ✅ Ambil SEMUA data tanpa limit, atau set limit sangat besar
    const { page, limit, status } = req.query;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    // ✅ OPSI 1: Ambil semua data (recommended untuk history)
    const { count, rows } = await LiveStream.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']], // Sort terbaru dulu
      // ❌ HAPUS limit dan offset - ambil semua
    });

    res.json({
      success: true,
      data: rows, // ✅ Kirim semua data
      pagination: {
        total: count,
        page: 1,
        limit: count, // Total = limit
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error getting live stream history:', error);
    res.status(500).json({ error: 'Failed to get live stream history' });
  }
};

exports.getLiveStreamDetail = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[getLiveStreamDetail] Fetching stream detail for ID: ${id}`);

    const stream = await LiveStream.findByPk(id);

    if (!stream) {
      console.log(`[getLiveStreamDetail] Stream not found for ID: ${id}`);
      return res.status(404).json({ error: 'Live stream not found' });
    }

    console.log(
      `[getLiveStreamDetail] Stream found - Status: ${stream.status}, Title: ${stream.title}`
    );

    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error('Error getting live stream detail:', error);
    res.status(500).json({ error: 'Failed to get live stream detail' });
  }
};

exports.updateRecordingPath = async (req, res) => {
  try {
    const { id, recordingPath } = req.body;

    console.log('📝 Updating recording path:', { id, recordingPath });

    const [updatedRows] = await LiveStream.update(
      {
        recordingPath: recordingPath,
        status: 'recording',
        isRecording: true
      },
      {
        where: { id: id }
      }
    );

    console.log('✅ Recording path updated:', {
      id,
      recordingPath,
      updatedRows
    });

    const updatedStream = await LiveStream.findByPk(id);
    if (updatedStream) {
      console.log('✅ Verification - Updated stream:', {
        id: updatedStream.id,
        recordingPath: updatedStream.recordingPath,
        status: updatedStream.status
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating recording path:', error);
    res.status(500).json({ error: 'Failed to update recording path' });
  }
};

// ✅ STREAM VIDEO (dengan path benar)
exports.streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎥 Stream video requested for ID: ${id}`);

    const stream = await LiveStream.findByPk(id);
    if (!stream) {
      console.log(`❌ Stream not found in database for ID: ${id}`);
      return res.status(404).json({ error: 'Live stream tidak ditemukan' });
    }

    let filePath;
    if (stream.recordingPath) {
      filePath = path.join(__dirname, '..', stream.recordingPath);
      console.log(`📁 Using recording path from DB: ${filePath}`);
    } else {
      filePath = path.join(__dirname, '../uploads', `${id}.webm`);
      console.log(`📁 Using default path: ${filePath}`);
    }

    if (filePath.endsWith('.part') || filePath.includes('.part')) {
      console.warn('Attempt to serve temp file (part):', filePath);
      return res
        .status(404)
        .json({ error: 'Video file belum tersedia' });
    }

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Video file not found at path: ${filePath}`);
      return res.status(404).json({
        error: 'Video file tidak ditemukan',
        details: 'File tidak ada di server'
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    const MIN_VALID_BYTES = 10 * 1024;
    if (fileSize < MIN_VALID_BYTES) {
      console.warn(
        `File ${filePath} too small (${fileSize} bytes). Treat as not ready.`
      );
      return res.status(404).json({
        error: 'Video file belum tersedia (masih diproses)'
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.m4v': 'video/x-m4v'
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (
        isNaN(start) ||
        isNaN(end) ||
        start > end ||
        start < 0
      ) {
        return res
          .status(416)
          .setHeader('Content-Range', `bytes */${fileSize}`)
          .end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      };
      res.writeHead(206, head);
      console.log(
        `📤 Streaming chunk: ${start}-${end}/${fileSize} (${contentType})`
      );
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType
      };
      res.writeHead(200, head);
      console.log(
        `📤 Streaming full video: ${fileSize} bytes (${contentType})`
      );
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('❌ Error streaming video:', error);
    res.status(500).json({
      error: 'Gagal streaming video',
      details: error.message
    });
  }
};

// ✅ DOWNLOAD VIDEO
exports.downloadVideo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`⬇️ Download video requested for ID: ${id}`);

    const stream = await LiveStream.findByPk(id);

    if (!stream) {
      console.log(`❌ Stream not found in database for ID: ${id}`);
      return res.status(404).json({ error: 'Live stream tidak ditemukan' });
    }

    let filePath;

    if (stream.recordingPath) {
      filePath = path.join(__dirname, '..', stream.recordingPath);
      console.log(`📁 Using recording path from DB: ${filePath}`);
    } else {
      filePath = path.join(__dirname, '../uploads', `${id}.webm`);
      console.log(`📁 Using default path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Video file not found at path: ${filePath}`);
      return res.status(404).json({ error: 'Video file tidak ditemukan' });
    }

    console.log(`✅ Starting download for file: ${filePath}`);
    res.download(filePath, `live_stream_${id}.webm`);
  } catch (error) {
    console.error('❌ Error downloading video:', error);
    res.status(500).json({
      error: 'Gagal download video',
      details: error.message
    });
  }
};

// ✅ PERBAIKAN 3: Upload recording TANPA rename (aman)
exports.uploadLiveStreamRecording = async (req, res) => {
  try {
    const { streamId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!streamId) {
      return res.status(400).json({ error: 'streamId wajib diisi' });
    }

    // Path file WEBM hasil upload
    const webmFilename = req.file.filename; // harusnya <streamId>.webm
    const webmPath = path.join(__dirname, '..', 'uploads', webmFilename);

    // Nama file MP4 output
    const mp4Filename = `${streamId}_${Date.now()}.mp4`;
    const mp4Path = path.join(__dirname, '..', 'uploads', mp4Filename);

    console.log('🎥 Converting WebM to MP4 with ffmpeg:', {
      webmPath,
      mp4Path,
    });

    // Jalankan ffmpeg: convert webm -> mp4 dengan faststart
    const ffmpegArgs = [
      '-i', webmPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:v', '2000k',
      '-movflags', '+faststart',
      '-y',
      mp4Path,
    ];

    const ff = spawn('ffmpeg', ffmpegArgs);

    ff.stderr.on('data', (data) => {
      console.log(`[ffmpeg convert ${streamId}] ${data.toString()}`);
    });

    ff.on('error', (err) => {
      console.error('❌ ffmpeg spawn error:', err);
    });

    ff.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ ffmpeg exited with code ${code}`);
        return res.status(500).json({ error: 'Gagal convert video di server' });
      }

      console.log('✅ ffmpeg convert done:', mp4Path);

      // Optional: hapus file webm asli
      try {
        fs.unlinkSync(webmPath);
      } catch (e) {
        console.warn('⚠️ gagal hapus webm (boleh diabaikan):', e.message);
      }

      // Update LiveStream di DB -> pakai file MP4
      const recordingPath = `/uploads/${mp4Filename}`;

      await LiveStream.update(
        {
          recordingPath,
          isRecording: false,
          status: 'ended',
        },
        { where: { id: streamId } }
      );

      return res.json({
        success: true,
        recordingPath,
      });
    });
  } catch (err) {
    console.error('❌ Error uploadLiveStreamRecording:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getRecordings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await LiveStream.findAndCountAll({
      where: {
        isRecording: true,
        recordingPath: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ error: 'Failed to get recordings' });
  }
};

exports.deleteLiveStream = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Delete request received for ID:', id);

    const stream = await LiveStream.findByPk(id);
    console.log('Stream found:', stream ? 'Yes' : 'No');

    if (!stream) {
      console.log('❌ Stream not found in database');
      return res.status(404).json({
        success: false,
        error: 'Live stream tidak ditemukan'
      });
    }

    if (stream.recordingPath) {
      const filePath = path.join(__dirname, '..', stream.recordingPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('✅ Recording file deleted:', filePath);
        } catch (fileError) {
          console.error('❌ Error deleting recording file:', fileError);
        }
      } else {
        console.log('⚠️ Recording file not found:', filePath);
      }
    }

    const thumbnailPath = path.join(
      __dirname,
      '../uploads',
      `thumb_${id}.jpg`
    );
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath);
        console.log('✅ Thumbnail file deleted:', thumbnailPath);
      } catch (fileError) {
        console.error('❌ Error deleting thumbnail file:', fileError);
      }
    }

    await stream.destroy();

    liveStreams = liveStreams.filter(s => s.id !== id);
    streamingStats.activeStreams = liveStreams.length;
    streamingStats.streamHistory = streamingStats.streamHistory.filter(
      h => h.id !== id
    );

    console.log('✅ Live stream deleted successfully:', id);

    res.json({
      success: true,
      message: 'Live stream berhasil dihapus'
    });
  } catch (error) {
    console.error('❌ Error deleting live stream:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menghapus live stream'
    });
  }
};

exports.notifyStreamEnded = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    console.log('Stream ended notification received for room:', roomId);

    res.json({
      success: true,
      message: 'Stream ended notification processed'
    });
  } catch (error) {
    console.error('Error processing stream ended notification:', error);
    res.status(500).json({
      error: 'Failed to process stream ended notification'
    });
  }
};

exports.cleanupEndedStreams = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  liveStreams = liveStreams.filter(stream => {
    const startTime = new Date(stream.startTime);
    return startTime > oneHourAgo;
  });

  streamingStats.activeStreams = liveStreams.length;

  console.log(
    'Cleaned up ended streams from memory. Active streams:',
    liveStreams.length
  );
};
