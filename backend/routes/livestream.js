const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/liveStreamController');

// Public routes
router.get('/active', ctrl.getActive);
router.get('/stats', ctrl.getStats);
router.get('/history', ctrl.getLiveStreamHistory);
router.get('/recordings', ctrl.getRecordings);

// Live control
router.post('/start', ctrl.startLive);
router.post('/stop', ctrl.stopLive);
router.post('/viewers', ctrl.updateViewers);
router.post('/reset-stats', ctrl.resetStats);
router.post('/sync-stats', ctrl.syncStats);
router.post('/update-recording', ctrl.updateRecordingPath);

// ❗ gunakan middleware upload MULTER dari controller, bukan buat baru
router.post(
  '/upload-recording',
  ctrl.uploadRecordingMiddleware,
  ctrl.uploadLiveStreamRecording
);

router.post('/stream-ended', ctrl.notifyStreamEnded);

// streaming + detail
router.delete('/:id', ctrl.deleteLiveStream);
router.get('/info/:id', ctrl.getStreamInfo);
router.get('/current-stats/:id', ctrl.getCurrentStreamStats);
router.get('/detail/:id', ctrl.getLiveStreamDetail);
router.get('/stream/:id', ctrl.streamVideo);
router.get('/download/:id', ctrl.downloadVideo);

module.exports = router;
