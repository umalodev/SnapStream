const { Recording } = require('../models');
const { logActivity } = require('./activityLogController');
const path = require('path');
const fs = require('fs');

// Upload recording
exports.uploadRecording = async (req, res) => {
  try {
    const { judul, duration } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!judul) return res.status(400).json({ error: 'Judul wajib diisi' });

    const filename = req.file.filename;
    await Recording.create({ 
      filename, 
      judul,
      duration: duration ? parseInt(duration) : 0,
      uploadedAt: new Date() 
    });
    
    // Log activity - handle case where req.user might not exist
    try {
      await logActivity(
        req.user?.id || 1, // Default admin ID if not available
        req.user?.role || 'admin',
        req.user?.name || 'admin',
        'upload_recording',
        `${req.user?.name || 'Admin'} uploaded a recording: ${judul}`,
        { filename, judul }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the upload if logging fails
    }
    
    res.json({ success: true, filename });
  } catch (err) {
    console.error('Error uploading recording:', err);
    res.status(500).json({ error: 'Gagal upload recording' });
  }
};

// List recordings
exports.listRecordings = async (req, res) => {
  try {
    // Optional limit via query string
    const limit = req.query && req.query.limit ? parseInt(req.query.limit) : undefined;
    const recordings = await Recording.findAll({ 
      order: [['uploadedAt', 'DESC']],
      ...(limit ? { limit } : {})
    });
    // Add URL for each recording
    const recordingsWithUrl = recordings.map(rec => {
      // Ensure uploadedAt is a Date object
      const uploadedDate = new Date(rec.uploadedAt);
      
      return {
        id: rec.id,
        filename: rec.filename,
        judul: rec.judul,
        duration: rec.duration || 0,
        uploadedAt: rec.uploadedAt,
        url: `http://192.168.1.15:3000/api/recording/stream/${rec.filename}`,
        tanggal: uploadedDate.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });
    res.json(recordingsWithUrl);
  } catch (err) {
    console.error('Error in listRecordings:', err);
    res.status(500).json({ error: 'Gagal mengambil data recording' });
  }
};


// Download recording
exports.downloadRecording = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads', filename);
  res.download(filePath);
};

// Delete recording
exports.deleteRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const recording = await Recording.findByPk(id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording tidak ditemukan' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads', recording.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await recording.destroy();

    // Log activity - handle case where req.user might not exist
    try {
      await logActivity(
        req.user?.id || 1, // Default admin ID if not available
        req.user?.role || 'admin',
        req.user?.name || 'admin',
        'delete_recording',
        `${req.user?.name || 'Admin'} deleted recording: ${recording.judul}`,
        { filename: recording.filename, judul: recording.judul }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the delete if logging fails
    }

    res.json({ success: true, message: 'Recording berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting recording:', err);
    res.status(500).json({ error: 'Gagal menghapus recording' });
  }
};

// Stream recording (for video playback)
exports.streamRecording = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set CORS headers for video streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
};


 