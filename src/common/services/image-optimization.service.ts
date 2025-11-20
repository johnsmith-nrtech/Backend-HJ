import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  progressive?: boolean;
  removeMetadata?: boolean;
}

export interface OptimizationResult {
  buffer: Buffer;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  filename: string;
}

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  // Default optimization settings for different use cases
  private readonly defaultOptions: ImageOptimizationOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'webp',
    progressive: true,
    removeMetadata: true,
  };

  private readonly thumbnailOptions: ImageOptimizationOptions = {
    maxWidth: 600,
    maxHeight: 600,
    quality: 80,
    format: 'webp',
    progressive: true,
    removeMetadata: true,
  };

  /**
   * Optimize an image from file path
   * @param filePath Path to the source image file
   * @param options Optimization options
   * @returns Optimized image buffer and metadata
   */
  async optimizeImageFromPath(
    filePath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Source file not found: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      const originalSize = fileStats.size;
      
      this.logger.log(`Starting optimization for: ${filePath} (${this.formatBytes(originalSize)})`);

      // Read the original file
      const inputBuffer = fs.readFileSync(filePath);
      return await this.optimizeImageFromBuffer(inputBuffer, options, path.basename(filePath));

    } catch (error) {
      this.logger.error(`Failed to optimize image from path: ${error.message}`);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  /**
   * Optimize an image from buffer
   * @param inputBuffer Source image buffer
   * @param options Optimization options
   * @param originalFilename Original filename for reference
   * @returns Optimized image buffer and metadata
   */
  async optimizeImageFromBuffer(
    inputBuffer: Buffer,
    options: ImageOptimizationOptions = {},
    originalFilename: string = 'image'
  ): Promise<OptimizationResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const originalSize = inputBuffer.length;
      
      this.logger.log(`Optimizing image buffer (${this.formatBytes(originalSize)})`);

      // Initialize Sharp instance
      let sharpInstance = sharp(inputBuffer);

      // Get metadata
      const metadata = await sharpInstance.metadata();
      this.logger.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Remove metadata if requested
      if (opts.removeMetadata) {
        sharpInstance = sharpInstance.rotate(); // Auto-rotate based on EXIF and remove metadata
      }

      // Resize if needed
      if (opts.maxWidth || opts.maxHeight) {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Determine output format
      const outputFormat = this.determineOutputFormat(opts.format, metadata.format, originalFilename);
      
      // Apply format-specific optimizations
      switch (outputFormat) {
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: opts.quality,
            effort: 4, // Good balance between compression and speed
          });
          break;
        
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: opts.quality,
            progressive: opts.progressive,
            mozjpeg: true, // Use mozjpeg encoder for better compression
          });
          break;
        
        case 'png':
          sharpInstance = sharpInstance.png({
            compressionLevel: 8,
            adaptiveFiltering: true,
          });
          break;
      }

      // Execute the optimization
      const optimizedBuffer = await sharpInstance.toBuffer();
      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      // Generate optimized filename
      const fileExtension = this.getFileExtension(outputFormat);
      const baseName = path.parse(originalFilename).name;
      const optimizedFilename = `${baseName}_optimized.${fileExtension}`;

      const result: OptimizationResult = {
        buffer: optimizedBuffer,
        originalSize,
        optimizedSize,
        compressionRatio,
        format: outputFormat,
        filename: optimizedFilename,
      };

      this.logger.log(
        `Optimization complete: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} ` +
        `(${compressionRatio.toFixed(1)}% reduction, format: ${outputFormat})`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to optimize image buffer: ${error.message}`);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  /**
   * Create a thumbnail version of an image
   * @param inputBuffer Source image buffer
   * @param originalFilename Original filename for reference
   * @returns Optimized thumbnail buffer and metadata
   */
  async createThumbnail(
    inputBuffer: Buffer,
    originalFilename: string = 'thumbnail'
  ): Promise<OptimizationResult> {
    return await this.optimizeImageFromBuffer(inputBuffer, this.thumbnailOptions, originalFilename);
  }

  /**
   * Check if a file is a supported image format
   * @param filename Filename to check
   * @returns True if supported
   */
  isSupportedImageFormat(filename: string): boolean {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.avif'];
    const extension = path.extname(filename).toLowerCase();
    return supportedExtensions.includes(extension);
  }

  /**
   * Determine the best output format based on options and input
   * @param requestedFormat Requested format
   * @param originalFormat Original image format
   * @param filename Original filename
   * @returns Optimal output format
   */
  private determineOutputFormat(
    requestedFormat: string | undefined,
    originalFormat: string | undefined,
    filename: string
  ): string {
    // If explicitly requested, use that format
    if (requestedFormat && requestedFormat !== 'auto') {
      return requestedFormat;
    }

    // For PNG images with transparency, keep as PNG to preserve transparency
    if (originalFormat === 'png') {
      return 'png';
    }

    // For animated GIFs, keep as original (though Sharp doesn't handle animations well)
    if (originalFormat === 'gif') {
      return 'gif';
    }

    // For everything else, default to WebP for best compression
    return 'webp';
  }

  /**
   * Get file extension for a given format
   * @param format Image format
   * @returns File extension
   */
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      'webp': 'webp',
      'jpeg': 'jpg',
      'png': 'png',
      'gif': 'gif',
      'avif': 'avif',
    };
    return extensions[format] || 'jpg';
  }

  /**
   * Format bytes to human readable string
   * @param bytes Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
} 