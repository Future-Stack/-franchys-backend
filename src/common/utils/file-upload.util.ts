import { BadRequestException } from '@nestjs/common';
import { memoryStorage, Options } from 'multer';

export const IMAGE_MIME_TYPES = /\/(jpg|jpeg|png|gif|webp|svg\+xml)$/i;
export const MOCKUP_MIME_TYPES =
  /\/(jpg|jpeg|png|gif|webp|svg\+xml|pdf|vnd\.adobe\.photoshop|postscript)$/i;

/**
 * Creates standardized Multer options for file upload endpoints.
 * @param maxSizeMB Maximum file size in MB (defaults to 50MB)
 * @param allowedMimeTypes RegExp to validate MIME types
 */
export const createMulterOptions = (
  maxSizeMB: number = 50,
  allowedMimeTypes: RegExp = IMAGE_MIME_TYPES,
): Options => ({
  storage: memoryStorage(),
  limits: {
    fileSize: maxSizeMB * 1024 * 1024,
    fieldSize: maxSizeMB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.match(allowedMimeTypes)) {
      return cb(
        new BadRequestException(
          `Unsupported file type "${file.mimetype || 'unknown'}". Allowed formats: ${
            allowedMimeTypes === MOCKUP_MIME_TYPES
              ? 'JPG, PNG, WEBP, GIF, SVG, PDF'
              : 'JPG, PNG, WEBP, GIF, SVG'
          }`,
        ),
      );
    }
    cb(null, true);
  },
});
