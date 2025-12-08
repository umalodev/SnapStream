const { ActivityLog } = require('../models');

// Fungsi untuk mencatat aktivitas
const logActivity = async (userId, userRole, userName, action, description, details = null) => {
  try {
    await ActivityLog.create({
      userId,
      userRole,
      userName,
      action,
      description,
      details,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 hari dari sekarang
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
// Fungsi untuk membersihkan aktivitas yang sudah expired
const cleanupExpiredActivities = async () => {
  try {
    await ActivityLog.destroy({
      where: {
        expiresAt: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired activities:', error);
  }
};

// Get recent activities (hanya yang belum expired)
const getRecentActivities = async (req, res) => {
  try {
    // Cleanup expired activities first
    await cleanupExpiredActivities();
    
    const activities = await ActivityLog.findAll({
      where: {
        expiresAt: {
          [require('sequelize').Op.gt]: new Date()
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json(activities);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({ error: 'Failed to get recent activities' });
  }
};

// Get activities by user role
const getActivitiesByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Cleanup expired activities first
    await cleanupExpiredActivities();
    
    const activities = await ActivityLog.findAll({
      where: {
        userRole: role,
        expiresAt: {
          [require('sequelize').Op.gt]: new Date()
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json(activities);
  } catch (error) {
    console.error('Error getting activities by role:', error);
    res.status(500).json({ error: 'Failed to get activities by role' });
  }
};

// Manual cleanup endpoint (untuk admin)
const manualCleanup = async (req, res) => {
  try {
    const deletedCount = await ActivityLog.destroy({
      where: {
        expiresAt: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    });
    
    res.json({ 
      message: `Cleaned up ${deletedCount} expired activities`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup expired activities' });
  }
};

module.exports = {
  logActivity,
  cleanupExpiredActivities,
  getRecentActivities,
  getActivitiesByRole,
  manualCleanup
}; 