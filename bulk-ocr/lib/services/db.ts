import type { ProcessingJob, AppSettings, OCRProvider } from '../types';
import { DEFAULT_SETTINGS } from '../stores/store';
import { SQLiteDatabase } from './sqlite-database';

// Core interfaces that define our data models
export interface CachedModel {
  provider: OCRProvider;
  modelId: string;
  capabilities: string[];
  lastChecked: Date;
}

export interface CachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string; // Store file path instead of raw data
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface PageResult {
  jobId: string;
  pageNumber: number;
  text: string;
  confidence?: number;
  imagePath?: string; // Store image path instead of URL
  thumbnailPath?: string;
  metadata?: {
    width?: number;
    height?: number;
    dpi?: number;
    orientation?: number;
  };
  createdAt: Date;
}

// Database interface that defines all operations
export interface DatabaseOperations {
  initialize(): Promise<void>;
  saveJob(job: ProcessingJob): Promise<string>;
  updateJob(id: string, updates: Partial<ProcessingJob>): Promise<void>;
  getJobs(): Promise<ProcessingJob[]>;
  getJob(id: string): Promise<ProcessingJob | undefined>;
  deleteJob(id: string): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  getSettings(): Promise<AppSettings | undefined>;
  cacheModel(model: CachedModel): Promise<void>;
  getCachedModels(provider: OCRProvider): Promise<CachedModel[]>;
  saveFile(file: CachedFile): Promise<void>;
  getFile(id: string): Promise<CachedFile | undefined>;
  deleteFile(id: string): Promise<void>;
  savePageResult(pageResult: PageResult): Promise<void>;
  getPageResults(jobId: string): Promise<PageResult[]>;
  getPageResult(jobId: string, pageNumber: number): Promise<PageResult | undefined>;
  deletePageResults(jobId: string): Promise<void>;
  cleanup(olderThan: Date): Promise<void>;
}

// Abstract base class for database implementations
export abstract class BaseDatabase implements DatabaseOperations {
  protected isInitialized = false;

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  abstract initialize(): Promise<void>;
  abstract saveJob(job: ProcessingJob): Promise<string>;
  abstract updateJob(id: string, updates: Partial<ProcessingJob>): Promise<void>;
  abstract getJobs(): Promise<ProcessingJob[]>;
  abstract getJob(id: string): Promise<ProcessingJob | undefined>;
  abstract deleteJob(id: string): Promise<void>;
  abstract saveSettings(settings: AppSettings): Promise<void>;
  abstract getSettings(): Promise<AppSettings | undefined>;
  abstract cacheModel(model: CachedModel): Promise<void>;
  abstract getCachedModels(provider: OCRProvider): Promise<CachedModel[]>;
  abstract saveFile(file: CachedFile): Promise<void>;
  abstract getFile(id: string): Promise<CachedFile | undefined>;
  abstract deleteFile(id: string): Promise<void>;
  abstract savePageResult(pageResult: PageResult): Promise<void>;
  abstract getPageResults(jobId: string): Promise<PageResult[]>;
  abstract getPageResult(jobId: string, pageNumber: number): Promise<PageResult | undefined>;
  abstract deletePageResults(jobId: string): Promise<void>;
  abstract cleanup(olderThan: Date): Promise<void>;
}

// Create and export a single database instance
export const db = new SQLiteDatabase();

// Initialize the database
db.initialize().catch(console.error);

// Export the database instance as default
export default db; 