// backend/models/index.js
const sequelize = require('./sequelize');
const User = require('./user');
const Recording = require('./recording');
const ActivityLog = require('./activityLog');
const LiveStream = require('./liveStream');

module.exports = { sequelize, User, Recording, ActivityLog, LiveStream };
