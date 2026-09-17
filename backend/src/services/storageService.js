const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload file buffer or base64
   * @param {Object} file { buffer, originalname, mimetype }
   * @param {string} folder 'licenses' | 'profiles'
   */
  async uploadFile({ buffer, originalname, mimetype }, folder = 'licenses') {
    const fileExt = path.extname(originalname) || '.pdf';
    const filename = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExt}`;

    // In local dev/test: write to local upload directory
    const targetFolder = path.join(this.uploadDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const localPath = path.join(this.uploadDir, filename);
    if (buffer) {
      fs.writeFileSync(localPath, buffer);
    }

    logger.info(`📁 [StorageService] Stored file: ${filename} (${mimetype})`);

    // In production, upload to S3 with AES256 server-side encryption per TRD Section 7
    return {
      url: `/uploads/${filename}`,
      filename,
      mimetype
    };
  }
}

module.exports = new StorageService();
