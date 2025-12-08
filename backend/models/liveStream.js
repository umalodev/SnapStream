const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const LiveStream = sequelize.define('LiveStream', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Title of the live stream'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Duration in hours'
  },
  viewers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isRecording: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  recordingPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to recorded video file'
  },
  status: {
    type: DataTypes.ENUM('active', 'ended', 'recording'),
    allowNull: false,
    defaultValue: 'active',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'live_streams',
  timestamps: true,
});

module.exports = LiveStream;
