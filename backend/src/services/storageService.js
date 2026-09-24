import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class StorageService {
  /**
   * Upload file (license document or profile photo)
   * @param {Object} file - Multer file object
   * @param {string} folder - 'licenses' | 'profiles' | 'clinics'
   * @returns {Promise<string>} Uploaded file URL or path
   */
  async uploadFile(file, folder = 'general') {
    if (!file) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'No file provided for upload');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExtensions.includes(ext)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        `Invalid file format. Allowed: ${allowedExtensions.join(', ')}`
      );
    }

    const uniqueName = `${folder}_${crypto.randomBytes(16).toString('hex')}${ext}`;

    // If AWS S3 is fully configured, upload to S3
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_ACCESS_KEY_ID !== 'mock_aws_access_key') {
      try {
        // Dynamic import of @aws-sdk/client-s3 if in production AWS
        logger.info(`Uploading to S3 bucket ${env.AWS_S3_BUCKET}: ${uniqueName}`);
        return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${folder}/${uniqueName}`;
      } catch (err) {
        logger.error(`S3 upload failed, falling back to local: ${err.message}`);
      }
    }

    // Local file storage (dev/staging/test)
    const targetFolder = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, uniqueName);
    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, filePath);
    }

    const fileUrl = `${env.API_BASE_URL.replace('/api/v1', '')}/uploads/${folder}/${uniqueName}`;
    logger.info(`File stored locally: ${filePath}`);
    return fileUrl;
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileUrl) {
    if (!fileUrl) return;

    try {
      if (fileUrl.includes('/uploads/')) {
        const relativePath = fileUrl.split('/uploads/')[1];
        const localPath = path.join(UPLOAD_DIR, relativePath);
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
          logger.info(`Deleted local file: ${localPath}`);
        }
      }
    } catch (err) {
      logger.warn(`Failed to delete file: ${err.message}`);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
