import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import sharp from 'sharp';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Optimizes image buffers before uploading to Cloudinary:
   * - Resizes oversized images (max 2048x2048) preserving aspect ratio
   * - Auto-orients images based on EXIF data (fixes mobile photo rotation)
   * - Compresses quality (85%) to ensure files stay well under Cloudinary's 10MB limit
   * - Leaves vectors (SVG) and non-images (PDF mockups) intact
   */
  async optimizeImageBuffer(file: Express.Multer.File): Promise<Buffer> {
    if (!file || !file.buffer || !file.buffer.length) {
      return file?.buffer;
    }

    const mimetype = file.mimetype || '';

    // Non-images (e.g. PDF/AI mockups) or vector SVG: do not rasterize
    if (!mimetype.startsWith('image/') || mimetype.includes('svg')) {
      return file.buffer;
    }

    try {
      const isGif = mimetype.includes('gif');
      // Keep lightweight GIFs as-is
      if (isGif && file.buffer.length < 5 * 1024 * 1024) {
        return file.buffer;
      }

      const imagePipeline = sharp(file.buffer, {
        animated: isGif,
        failOn: 'none',
      }).rotate();

      const metadata = await imagePipeline.metadata();
      const needsResize =
        (metadata.width && metadata.width > 2048) ||
        (metadata.height && metadata.height > 2048) ||
        file.buffer.length > 2 * 1024 * 1024;

      if (needsResize) {
        imagePipeline.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      let optimizedBuffer: Buffer;

      if (mimetype.includes('png')) {
        // If PNG is over 4MB, convert to WebP to keep alpha transparency and fit well below 10MB
        if (file.buffer.length > 4 * 1024 * 1024) {
          optimizedBuffer = await imagePipeline
            .webp({ quality: 85 })
            .toBuffer();
        } else {
          optimizedBuffer = await imagePipeline
            .png({ compressionLevel: 8 })
            .toBuffer();
        }
      } else if (mimetype.includes('webp')) {
        optimizedBuffer = await imagePipeline.webp({ quality: 85 }).toBuffer();
      } else {
        // Default JPEG compression
        optimizedBuffer = await imagePipeline
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      }

      this.logger.log(
        `Optimized image "${file.originalname}": ${(file.buffer.length / (1024 * 1024)).toFixed(2)} MB -> ${(optimizedBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      );

      return optimizedBuffer;
    } catch (err: any) {
      this.logger.warn(
        `Image optimization skipped for "${file.originalname}": ${err.message}`,
      );
      return file.buffer;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for upload');
    }

    const bufferToUpload = await this.optimizeImageBuffer(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed for "${file.originalname}": ${error.message}`,
            );
            return reject(
              new BadRequestException(
                `Image upload failed: ${error.message || 'Cloudinary upload error'}`,
              ),
            );
          }
          if (result) return resolve(result);
          reject(
            new BadRequestException(
              'Image upload failed: No response received from Cloudinary',
            ),
          );
        },
      );

      streamifier.createReadStream(bufferToUpload).pipe(uploadStream);
    });
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'products',
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    const results = await Promise.all(uploadPromises);
    return results.map((result) => result.secure_url);
  }
}
