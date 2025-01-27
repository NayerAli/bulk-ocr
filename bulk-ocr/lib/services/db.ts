import Dexie, { Table } from 'dexie';
import type { ProcessingJob, AppSettings, OCRProvider } from '../types';

interface CachedModel {
  provider: OCRProvider;
  modelId: string;
  capabilities: string[];
  lastChecked: Date;
}

interface CachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  uploadedAt: Date;
}

interface PageResult {
  jobId: string;
  pageNumber: number;
  text: string;
  confidence?: number;
  imageUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    dpi?: number;
    orientation?: number;
  };
  createdAt: Date;
}

export class OCRDatabase extends Dexie {
  jobs!: Table<ProcessingJob>;
  settings!: Table<AppSettings>;
  models!: Table<CachedModel>;
  files!: Table<CachedFile>;
  pageResults!: Table<PageResult>;

  constructor() {
    super('OCRDatabase');
    
    this.version(1).stores({
      jobs: '++id, status, createdAt',
      settings: '++id',
      models: '[provider+modelId], lastChecked',
      files: 'id, name, type, uploadedAt',
      pageResults: '[jobId+pageNumber], createdAt'
    });
  }

  async saveJob(job: ProcessingJob): Promise<string> {
    return await this.jobs.add(job);
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<void> {
    await this.jobs.update(id, updates);
  }

  async getJobs(): Promise<ProcessingJob[]> {
    return await this.jobs.orderBy('createdAt').reverse().toArray();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.settings.clear(); // Only keep latest settings
    await this.settings.add(settings);
  }

  async getSettings(): Promise<AppSettings | undefined> {
    return await this.settings.toCollection().first();
  }

  async cacheModel(model: CachedModel): Promise<void> {
    await this.models.put(model);
  }

  async getCachedModels(provider: OCRProvider): Promise<CachedModel[]> {
    return await this.models
      .where('provider')
      .equals(provider)
      .toArray();
  }

  async saveFile(file: CachedFile): Promise<void> {
    await this.files.put(file);
  }

  async getFile(id: string): Promise<CachedFile | undefined> {
    return await this.files.get(id);
  }

  async deleteFile(id: string): Promise<void> {
    await this.files.delete(id);
  }

  async savePageResult(pageResult: PageResult): Promise<void> {
    await this.pageResults.put(pageResult);
  }

  async getPageResults(jobId: string): Promise<PageResult[]> {
    return await this.pageResults
      .where('jobId')
      .equals(jobId)
      .sortBy('pageNumber');
  }

  async getPageResult(jobId: string, pageNumber: number): Promise<PageResult | undefined> {
    return await this.pageResults
      .where('[jobId+pageNumber]')
      .equals([jobId, pageNumber])
      .first();
  }

  async deletePageResults(jobId: string): Promise<void> {
    await this.pageResults
      .where('jobId')
      .equals(jobId)
      .delete();
  }

  async cleanup(olderThan: Date): Promise<void> {
    // Cleanup old jobs and files
    const oldJobIds = await this.jobs
      .where('createdAt')
      .below(olderThan)
      .primaryKeys();

    // Delete associated page results first
    for (const jobId of oldJobIds) {
      await this.deletePageResults(jobId as string);
    }

    // Then delete jobs
    await this.jobs
      .where('createdAt')
      .below(olderThan)
      .delete();
      
    await this.files
      .where('uploadedAt')
      .below(olderThan)
      .delete();

    // Cleanup old model cache
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.models
      .where('lastChecked')
      .below(thirtyDaysAgo)
      .delete();
  }
}

export const db = new OCRDatabase(); 