require('dotenv').config();

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || (isDev ? '192.168.1.37' : '0.0.0.0'),

  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'recording',
  DB_PORT: process.env.DB_PORT || 3306,

  // File Upload Configuration
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 104857600, // 100MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here_1759984954468',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || 7, // days

  // Media Server
  MEDIA_PORT: process.env.MEDIA_PORT || 8000,
  MEDIA_HOST: process.env.MEDIA_HOST || (isDev ? '192.168.1.37' : '0.0.0.0'),

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : (isDev ? ['http://192.168.1.37:5173', 'http://192.168.1.37:3000', 'http://localhost:5173', 'http://localhost:3000'] : ['http://192.168.1.37:3000', 'http://localhost:3000']),
}; 