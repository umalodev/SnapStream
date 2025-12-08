const express = require('express');
const router = express.Router();
const { 
  getRecentActivities, 
  getActivitiesByRole, 
  manualCleanup 
} = require('../controllers/activityLogController');

// All routes are now public (no authentication required)
router.get('/recent', getRecentActivities);
router.get('/role/:role', getActivitiesByRole);
router.delete('/cleanup', manualCleanup);

module.exports = router; 