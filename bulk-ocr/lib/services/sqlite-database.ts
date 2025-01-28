import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { ProcessingJob } from '../types';
import { DEFAULT_SETTINGS } from '../stores/store';
import { BaseDatabase, CachedModel, CachedFile, PageResult } from './database-types';

// Row type definitions for SQLite tables
interface JobRow {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalPages: number;
  processedPages: number;
  status: string;
  progress: number;
  error: string | null;
  text: string | null;
  metadata: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  details: string;
}

interface PageResultRow {
  jobId: string;
  pageNumber: number;
  text: string;
  confidence: number | null;
  imagePath: string | null;
  thumbnailPath: string | null;
  metadata: string | null;
  createdAt: string;
}

interface SettingsRow {
  settings: string;
}

interface FileRow {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  thumbnailUrl: string | null;
  uploadedAt: string;
}

interface ModelRow {
  provider: string;
  modelId: string;
  capabilities: string;
  lastChecked: string;
}

export class SQLiteDatabase extends BaseDatabase {
  private db: Database.Database;
  private thumbnailsDir: string;

  constructor() {
    super();
    const dbPath = path.join(process.cwd(), 'data', 'ocr.db');
    const dbDir = path.dirname(dbPath);
    
    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.thumbnailsDir = path.join(process.cwd(), 'data', 'thumbnails');
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
    }

    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          fileName TEXT NOT NULL,
          fileType TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          totalPages INTEGER NOT NULL,
          processedPages INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          progress REAL NOT NULL DEFAULT 0,
          error TEXT,
          text TEXT,
          metadata TEXT,
          createdAt DATETIME NOT NULL,
          startedAt DATETIME,
          completedAt DATETIME,
          details TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          settings TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS models (
          provider TEXT NOT NULL,
          modelId TEXT NOT NULL,
          capabilities TEXT NOT NULL,
          lastChecked DATETIME NOT NULL,
          PRIMARY KEY (provider, modelId)
        );

        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          size INTEGER NOT NULL,
          path TEXT NOT NULL,
          thumbnailUrl TEXT,
          uploadedAt DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS page_results (
          jobId TEXT NOT NULL,
          pageNumber INTEGER NOT NULL,
          text TEXT NOT NULL,
          confidence REAL,
          imagePath TEXT,
          thumbnailPath TEXT,
          metadata TEXT,
          createdAt DATETIME NOT NULL,
          PRIMARY KEY (jobId, pageNumber),
          FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_createdAt ON jobs(createdAt);
        CREATE INDEX IF NOT EXISTS idx_files_uploadedAt ON files(uploadedAt);
      `);

      // Initialize settings if not exists
      const settings = this.db.prepare('SELECT settings FROM settings WHERE id = 1').get() as SettingsRow | undefined;
      if (!settings) {
        this.db.prepare('INSERT INTO settings (id, settings) VALUES (1, ?)').run(
          JSON.stringify(DEFAULT_SETTINGS)
        );
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  async saveJob(job: ProcessingJob): Promise<string> {
    this.ensureInitialized();
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, fileName, fileType, fileSize, totalPages, processedPages,
        status, progress, error, text, metadata, createdAt, startedAt,
        completedAt, details
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      job.id,
      job.fileName,
      job.fileType,
      job.fileSize,
      job.totalPages,
      job.processedPages,
      job.status,
      job.progress,
      job.error,
      job.result,
      job.metadata ? JSON.stringify(job.metadata) : null,
      job.createdAt.toISOString(),
      job.startedAt?.toISOString(),
      job.completedAt?.toISOString(),
      JSON.stringify(job.details)
    );

    return job.id;
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<void> {
    this.ensureInitialized();
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'metadata' || key === 'details') {
          sets.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else if (value instanceof Date) {
          sets.push(`${key} = ?`);
          values.push(value.toISOString());
        } else {
          sets.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (sets.length === 0) return;

    const query = `UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`;
    values.push(id);

    this.db.prepare(query).run(...values);
  }

  async getJobs(): Promise<ProcessingJob[]> {
    this.ensureInitialized();
    const rows = this.db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all() as JobRow[];
    
    return rows.map(row => ({
      id: row.id,
      fileName: row.fileName,
      fileType: row.fileType as ProcessingJob['fileType'],
      fileSize: row.fileSize,
      totalPages: row.totalPages,
      processedPages: row.processedPages,
      status: row.status as ProcessingJob['status'],
      progress: row.progress,
      error: row.error || undefined,
      result: row.text || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      details: JSON.parse(row.details),
      createdAt: new Date(row.createdAt),
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined
    }));
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    if (!row) return undefined;

    return {
      id: row.id,
      fileName: row.fileName,
      fileType: row.fileType as ProcessingJob['fileType'],
      fileSize: row.fileSize,
      totalPages: row.totalPages,
      processedPages: row.processedPages,
      status: row.status as ProcessingJob['status'],
      progress: row.progress,
      error: row.error || undefined,
      result: row.text || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      details: JSON.parse(row.details),
      createdAt: new Date(row.createdAt),
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined
    };
  }

  async deleteJob(id: string): Promise<void> {
    this.ensureInitialized();
    
    // Get associated files to clean up
    const pageResults = await this.getPageResults(id);
    
    // Start transaction
    this.db.transaction(() => {
      // Delete job and its page results (cascade)
      this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
      
      // Clean up files
      for (const result of pageResults) {
        if (result.imagePath) {
          try {
            fs.unlinkSync(result.imagePath);
          } catch (error) {
            console.warn(`Failed to delete image file: ${result.imagePath}`, error);
          }
        }
        if (result.thumbnailPath) {
          try {
            fs.unlinkSync(result.thumbnailPath);
          } catch (error) {
            console.warn(`Failed to delete thumbnail file: ${result.thumbnailPath}`, error);
          }
        }
      }
    })();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.ensureInitialized();
    this.db.prepare('UPDATE settings SET settings = ? WHERE id = 1')
      .run(JSON.stringify(settings));
  }

  async getSettings(): Promise<AppSettings | undefined> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT settings FROM settings WHERE id = 1').get() as SettingsRow | undefined;
    return row ? JSON.parse(row.settings) : undefined;
  }

  async cacheModel(model: CachedModel): Promise<void> {
    this.ensureInitialized();
    this.db.prepare(`
      INSERT OR REPLACE INTO models (provider, modelId, capabilities, lastChecked)
      VALUES (?, ?, ?, ?)
    `).run(
      model.provider,
      model.modelId,
      JSON.stringify(model.capabilities),
      model.lastChecked.toISOString()
    );
  }

  async getCachedModels(provider: string): Promise<CachedModel[]> {
    this.ensureInitialized();
    const rows = this.db.prepare('SELECT * FROM models WHERE provider = ?').all(provider) as ModelRow[];
    
    return rows.map(row => ({
      provider: row.provider as CachedModel['provider'],
      modelId: row.modelId,
      capabilities: JSON.parse(row.capabilities),
      lastChecked: new Date(row.lastChecked)
    }));
  }

  async saveFile(file: CachedFile): Promise<void> {
    this.ensureInitialized();
    this.db.prepare(`
      INSERT OR REPLACE INTO files (id, name, type, size, path, thumbnailUrl, uploadedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      file.id,
      file.name,
      file.type,
      file.size,
      file.path,
      file.thumbnailUrl || null,
      file.uploadedAt.toISOString()
    );
  }

  async getFile(id: string): Promise<CachedFile | undefined> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow | undefined;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      size: row.size,
      path: row.path,
      thumbnailUrl: row.thumbnailUrl || undefined,
      uploadedAt: new Date(row.uploadedAt)
    };
  }

  async deleteFile(id: string): Promise<void> {
    this.ensureInitialized();
    
    // Get file info first
    const file = await this.getFile(id);
    if (!file) return;

    // Start transaction
    this.db.transaction(() => {
      // Delete database record
      this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
      
      // Clean up file
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.warn(`Failed to delete file: ${file.path}`, error);
      }
      
      // Clean up thumbnail if exists
      if (file.thumbnailUrl) {
        try {
          const thumbnailPath = path.join(this.thumbnailsDir, path.basename(file.thumbnailUrl));
          fs.unlinkSync(thumbnailPath);
        } catch (error) {
          console.warn(`Failed to delete thumbnail: ${file.thumbnailUrl}`, error);
        }
      }
    })();
  }

  async savePageResult(pageResult: PageResult): Promise<void> {
    this.ensureInitialized();
    this.db.prepare(`
      INSERT OR REPLACE INTO page_results (
        jobId, pageNumber, text, confidence, imagePath, thumbnailPath, metadata, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageResult.jobId,
      pageResult.pageNumber,
      pageResult.text,
      pageResult.confidence,
      pageResult.imagePath,
      pageResult.thumbnailPath,
      pageResult.metadata ? JSON.stringify(pageResult.metadata) : null,
      pageResult.createdAt.toISOString()
    );
  }

  async getPageResults(jobId: string): Promise<PageResult[]> {
    this.ensureInitialized();
    const rows = this.db.prepare(
      'SELECT * FROM page_results WHERE jobId = ? ORDER BY pageNumber'
    ).all(jobId) as PageResultRow[];

    return rows.map(row => ({
      jobId: row.jobId,
      pageNumber: row.pageNumber,
      text: row.text,
      confidence: row.confidence || undefined,
      imagePath: row.imagePath || undefined,
      thumbnailPath: row.thumbnailPath || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.createdAt)
    }));
  }

  async getPageResult(jobId: string, pageNumber: number): Promise<PageResult | undefined> {
    this.ensureInitialized();
    const row = this.db.prepare(
      'SELECT * FROM page_results WHERE jobId = ? AND pageNumber = ?'
    ).get(jobId, pageNumber) as PageResultRow | undefined;

    if (!row) return undefined;

    return {
      jobId: row.jobId,
      pageNumber: row.pageNumber,
      text: row.text,
      confidence: row.confidence || undefined,
      imagePath: row.imagePath || undefined,
      thumbnailPath: row.thumbnailPath || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.createdAt)
    };
  }

  async deletePageResults(jobId: string): Promise<void> {
    this.ensureInitialized();
    
    // Get page results first to clean up files
    const results = await this.getPageResults(jobId);
    
    // Start transaction
    this.db.transaction(() => {
      // Delete database records
      this.db.prepare('DELETE FROM page_results WHERE jobId = ?').run(jobId);
      
      // Clean up files
      for (const result of results) {
        if (result.imagePath) {
          try {
            fs.unlinkSync(result.imagePath);
          } catch (error) {
            console.warn(`Failed to delete image file: ${result.imagePath}`, error);
          }
        }
        if (result.thumbnailPath) {
          try {
            fs.unlinkSync(result.thumbnailPath);
          } catch (error) {
            console.warn(`Failed to delete thumbnail file: ${result.thumbnailPath}`, error);
          }
        }
      }
    })();
  }

  async cleanup(olderThan: Date): Promise<void> {
    this.ensureInitialized();
    const isoDate = olderThan.toISOString();

    // Get files to clean up
    const pageResults = this.db.prepare(`
      SELECT imagePath, thumbnailPath FROM page_results 
      WHERE jobId IN (SELECT id FROM jobs WHERE createdAt < ?)
    `).all(isoDate) as { imagePath: string | null; thumbnailPath: string | null; }[];

    const files = this.db.prepare(
      'SELECT path, thumbnailUrl FROM files WHERE uploadedAt < ?'
    ).all(isoDate) as { path: string; thumbnailUrl: string | null; }[];

    // Start transaction
    this.db.transaction(() => {
      // Delete database records
      this.db.prepare(`
        DELETE FROM page_results 
        WHERE jobId IN (SELECT id FROM jobs WHERE createdAt < ?)
      `).run(isoDate);

      this.db.prepare('DELETE FROM jobs WHERE createdAt < ?').run(isoDate);
      this.db.prepare('DELETE FROM files WHERE uploadedAt < ?').run(isoDate);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      this.db.prepare('DELETE FROM models WHERE lastChecked < ?').run(thirtyDaysAgo);

      // Clean up files
      for (const result of pageResults) {
        if (result.imagePath) {
          try {
            fs.unlinkSync(result.imagePath);
          } catch (error) {
            console.warn(`Failed to delete image file: ${result.imagePath}`, error);
          }
        }
        if (result.thumbnailPath) {
          try {
            fs.unlinkSync(result.thumbnailPath);
          } catch (error) {
            console.warn(`Failed to delete thumbnail file: ${result.thumbnailPath}`, error);
          }
        }
      }

      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.warn(`Failed to delete file: ${file.path}`, error);
        }
        if (file.thumbnailUrl) {
          try {
            const thumbnailPath = path.join(this.thumbnailsDir, path.basename(file.thumbnailUrl));
            fs.unlinkSync(thumbnailPath);
          } catch (error) {
            console.warn(`Failed to delete thumbnail: ${file.thumbnailUrl}`, error);
          }
        }
      }
    })();
  }
} 
