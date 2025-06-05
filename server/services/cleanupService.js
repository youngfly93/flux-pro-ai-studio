const fs = require('fs');
const path = require('path');

function cleanupUploads(directory, maxAgeMs) {
  fs.readdir(directory, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

function scheduleCleanup() {
  const uploadDir = path.join(__dirname, '../uploads');
  const days = parseInt(process.env.UPLOAD_MAX_AGE_DAYS || '7', 10);
  const maxAge = days * 24 * 60 * 60 * 1000;
  cleanupUploads(uploadDir, maxAge);
  setInterval(() => cleanupUploads(uploadDir, maxAge), 24 * 60 * 60 * 1000);
}

module.exports = { scheduleCleanup };
