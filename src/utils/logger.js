// ============================================================
// NEXPULSE LOGGER
// Logs everything to console + log files
// ============================================================

const winston = require('winston');
const path    = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    }),
    // File: all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/nexpulse.log'),
      maxsize:  5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    // File: errors only
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize:  2 * 1024 * 1024,
      maxFiles: 2,
    }),
  ],
});

module.exports = logger;
