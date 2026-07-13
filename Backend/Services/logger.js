const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Log files live in Backend/logs/. winston's File transport does not create
// missing directories on its own, so make sure it exists first — this is
// why no output file was ever showing up.
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // All logs (info and above)
    new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
    // Errors only, split out for easier troubleshooting
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    })
  ]
});
