import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { CachedFile } from './database-types';
import type { MimeType } from '@/lib/types/settings';
import db from './db';

export interface FileServiceConfig {
  uploadsDir: string;
  thumbnailsDir: string;
  maxFileSize: number;
  allowedTypes: MimeType[];
  thumbnailSize: {
    width: number;
    height: number;
  };
}

const DEFAULT_CONFIG: FileServiceConfig = {
  uploadsDir: path.join(process.cwd(), 'data', 'uploads'),
  thumbnailsDir: path.join(process.cwd(), 'data', 'thumbnails'),
  maxFileSize: 500 * 1024 * 1024, // 500MB
  allowedTypes: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/tiff",
    "image/bmp"
  ],
  thumbnailSize: {
    width: 200,
    height: 200
  }
};

export class FileService {
  private static instance: FileService;
  private config: FileServiceConfig;

  private constructor(config: Partial<FileServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Ensure directories exist
    fs.mkdirSync(this.config.uploadsDir, { recursive: true });
    fs.mkdirSync(this.config.thumbnailsDir, { recursive: true });
  }

  static getInstance(config?: Partial<FileServiceConfig>): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService(config);
    }
    return FileService.instance;
  }

  async saveFile(file: File): Promise<CachedFile> {
    // Validate file
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Normalize MIME type
    const normalizedType = this.normalizeMimeType(file.type, file.name);
    if (!this.config.allowedTypes.includes(normalizedType)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Generate unique ID and paths
    const id = uuidv4();
    const ext = path.extname(file.name);
    const fileName = `${id}${ext}`;
    const filePath = path.join(this.config.uploadsDir, fileName);

    try {
      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (normalizedType.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(filePath, id);
      }

      // Create file record
      const cachedFile: CachedFile = {
        id,
        name: file.name,
        type: normalizedType,
        size: file.size,
        path: filePath,
        thumbnailUrl,
        uploadedAt: new Date()
      };

      // Save to database
      await db.saveFile(cachedFile);

      return cachedFile;
    } catch (error) {
      // Clean up on error
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up file after error:', cleanupError);
      }
      throw error;
    }
  }

  private normalizeMimeType(type: string, fileName: string): MimeType {
    const lowerType = type.toLowerCase();
    const lowerName = fileName.toLowerCase();

    // Debug logging
    console.log('Normalizing MIME type:', {
      originalType: type,
      fileName,
      lowerType,
      lowerName
    });

    // Handle JPEG variations
    if (
      lowerType === 'image/jpeg' || 
      lowerType === 'image/jpg' || 
      lowerType === 'image/pjpeg' ||
      lowerType === 'image/x-citrix-jpeg' ||
      lowerName.endsWith('.jpg') || 
      lowerName.endsWith('.jpeg') || 
      lowerName.endsWith('.jpe') || 
      lowerName.endsWith('.jfif')
    ) {
      return 'image/jpeg';
    }

    // Handle PDF variations
    if (
      lowerType === 'application/pdf' ||
      lowerType === 'application/x-pdf' ||
      lowerType === 'application/acrobat' ||
      lowerType === 'applications/vnd.pdf' ||
      lowerName.endsWith('.pdf')
    ) {
      return 'application/pdf';
    }

    // Handle other image types
    if (lowerType === 'image/png' || lowerName.endsWith('.png')) {
      return 'image/png';
    }
    if (lowerType === 'image/tiff' || lowerName.endsWith('.tiff') || lowerName.endsWith('.tif')) {
      return 'image/tiff';
    }
    if (lowerType === 'image/bmp' || lowerName.endsWith('.bmp')) {
      return 'image/bmp';
    }

    // If no specific match, but it's a known image type, return as is
    if (this.config.allowedTypes.includes(lowerType as MimeType)) {
      return lowerType as MimeType;
    }

    // Log unrecognized type
    console.warn('Unrecognized file type:', {
      originalType: type,
      fileName,
      allowedTypes: this.config.allowedTypes
    });

    throw new Error(`Unsupported file type: ${type}`);
  }

  private async generateThumbnail(imagePath: string, id: string): Promise<string | undefined> {
    const thumbnailName = `${id}_thumb.webp`;
    const thumbnailPath = path.join(this.config.thumbnailsDir, thumbnailName);

    try {
      await sharp(imagePath)
        .resize(this.config.thumbnailSize.width, this.config.thumbnailSize.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      return `/thumbnails/${thumbnailName}`;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return undefined;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete file: ${filePath}`, error);
    }
  }

  async deleteThumbnail(thumbnailUrl: string): Promise<void> {
    try {
      const thumbnailPath = path.join(this.config.thumbnailsDir, path.basename(thumbnailUrl));
      await fs.promises.unlink(thumbnailPath);
    } catch (error) {
      console.warn(`Failed to delete thumbnail: ${thumbnailUrl}`, error);
    }
  }

  getPublicUrl(filePath: string): string {
    const fileName = path.basename(filePath);
    return `/uploads/${fileName}`;
  }

  async getFileStats(filePath: string): Promise<{ size: number; type: string }> {
    const stats = await fs.promises.stat(filePath);
    const type = this.getMimeType(filePath);
    return {
      size: stats.size,
      type
    };
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.tiff': 'image/tiff',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 