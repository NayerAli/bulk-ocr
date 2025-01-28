import Dexie from 'dexie';
import { BaseDatabase, CachedModel, CachedFile, PageResult } from './db';
import type { ProcessingJob, AppSettings, OCRProvider } from '../types';
import { DEFAULT_SETTINGS } from '../stores/store';

export class IndexedDBDatabase extends BaseDatabase {
  private db: Dexie;
  private static instance: IndexedDBDatabase;

  private constructor() {
    super();
    this.db = new Dexie('OCRDatabase');
    
    // Define database schema
    this.db.version(1).stores({
      jobs: 'id, status, createdAt',
      settings: 'id',
      models: '[provider+modelId], lastChecked',
      files: 'id, name, type, uploadedAt',
      pageResults: '[jobId+pageNumber], createdAt'
    });
  }

  static getInstance(): IndexedDBDatabase {
    if (!IndexedDBDatabase.instance) {
      IndexedDBDatabase.instance = new IndexedDBDatabase();
    }
    return IndexedDBDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test database access
      await this.db.open();
      await this.db.table('jobs').count();
      
      // Initialize settings if not exists
      const settings = await this.db.table('settings').toCollection().first();
      if (!settings) {
        await this.db.table('settings').add({
          id: 1,
          settings: DEFAULT_SETTINGS
        });
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB database:', error);
      throw error;
    }
  }

  async saveJob(job: ProcessingJob): Promise<string> {
    this.ensureInitialized();
    await this.db.table('jobs').put(job);
    return job.id;
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<void> {
    this.ensureInitialized();
    await this.db.table('jobs').update(id, updates);
  }

  async getJobs(): Promise<ProcessingJob[]> {
    this.ensureInitialized();
    return await this.db.table('jobs')
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    this.ensureInitialized();
    return await this.db.table('jobs').get(id);
  }

  async deleteJob(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db.table('jobs').delete(id);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.ensureInitialized();
    await this.db.table('settings').put({
      id: 1,
      settings
    });
  }

  async getSettings(): Promise<AppSettings | undefined> {
    this.ensureInitialized();
    const row = await this.db.table('settings').get(1);
    return row?.settings;
  }

  async cacheModel(model: CachedModel): Promise<void> {
    this.ensureInitialized();
    await this.db.table('models').put(model);
  }

  async getCachedModels(provider: OCRProvider): Promise<CachedModel[]> {
    this.ensureInitialized();
    return await this.db.table('models')
      .where('provider')
      .equals(provider)
      .toArray();
  }

  async saveFile(file: CachedFile): Promise<void> {
    this.ensureInitialized();
    await this.db.table('files').put(file);
  }

  async getFile(id: string): Promise<CachedFile | undefined> {
    this.ensureInitialized();
    return await this.db.table('files').get(id);
  }

  async deleteFile(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db.table('files').delete(id);
  }

  async savePageResult(pageResult: PageResult): Promise<void> {
    this.ensureInitialized();
    await this.db.table('pageResults').put(pageResult);
  }

  async getPageResults(jobId: string): Promise<PageResult[]> {
    this.ensureInitialized();
    return await this.db.table('pageResults')
      .where('jobId')
      .equals(jobId)
      .sortBy('pageNumber');
  }

  async getPageResult(jobId: string, pageNumber: number): Promise<PageResult | undefined> {
    this.ensureInitialized();
    return await this.db.table('pageResults')
      .where('[jobId+pageNumber]')
      .equals([jobId, pageNumber])
      .first();
  }

  async deletePageResults(jobId: string): Promise<void> {
    this.ensureInitialized();
    await this.db.table('pageResults')
      .where('jobId')
      .equals(jobId)
      .delete();
  }

  async cleanup(olderThan: Date): Promise<void> {
    this.ensureInitialized();
    
    await this.db.transaction('rw', 
      [this.db.jobs, this.db.pageResults, this.db.files, this.db.models], 
      async () => {
        // Delete old jobs and their page results
        await this.db.table('jobs')
          .where('createdAt')
          .below(olderThan)
          .delete();

        await this.db.table('pageResults')
          .where('createdAt')
          .below(olderThan)
          .delete();

        // Delete old files
        await this.db.table('files')
          .where('uploadedAt')
          .below(olderThan)
          .delete();

        // Delete old models
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.db.table('models')
          .where('lastChecked')
          .below(thirtyDaysAgo)
          .delete();
    });
  }
} 
