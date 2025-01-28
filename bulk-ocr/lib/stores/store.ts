import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppSettings, ProcessingJob, OCRSettings, ProcessingMetadata } from "@/lib/types"
import type { MimeType } from "@/lib/types/settings"
import { serviceManager } from "../services/service-manager"
import { ProcessingWorker } from "../services/processing-worker"
import { processImage as processImageAction } from "../actions/ocr-actions"

interface StoreState {
  jobs: ProcessingJob[]
  settings: AppSettings
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  worker: ProcessingWorker | null
  activeJobs: number
  isServicesInitialized: boolean

  // Initialization
  initialize: () => Promise<void>
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  updateOCRProvider: (provider: OCRSettings['provider']) => Promise<void>
  updateAPIKey: (provider: OCRSettings['provider'], apiKey: string) => Promise<void>
  
  // Job actions
  addJob: (job: ProcessingJob) => Promise<void>
  updateJob: (id: string, updates: Partial<ProcessingJob>) => Promise<void>
  removeJob: (id: string) => Promise<void>
  deleteJob: (jobId: string) => void

  // Processing
  processImage: (imageData: string, settings: AppSettings, pageNumber?: number) => Promise<{ 
    success: boolean
    text?: string
    error?: string
    metadata?: ProcessingMetadata
  }>

  // Page Results
  getPageResults: (jobId: string) => Promise<{ [key: number]: string }>
  getPageResult: (jobId: string, pageNumber: number) => Promise<string | undefined>
  savePageResult: (jobId: string, pageNumber: number, text: string, metadata?: ProcessingMetadata) => Promise<void>
}

interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: ProcessingMetadata;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ocr: {
    provider: "claude",
    model: "claude-3-opus-20240229",
    language: "arabic",
    retryAttempts: 3,
    retryDelay: 1000,
    confidence: 0.8,
    apiKeys: {},
    isTestMode: false
  },
  processing: {
    maxConcurrentJobs: 2,
    chunkSize: 10,
    concurrentChunks: 2,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedFileTypes: [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
      "image/png",
      "image/tiff",
      "image/bmp"
    ] as MimeType[],
    maxSimultaneousUploads: 5,
  },
  display: {
    recentDocsCount: 5,
    dashboardRefreshRate: 5000,
    theme: "system",
    dateFormat: "MMM D, YYYY",
    timeFormat: "h:mm A",
  },
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      jobs: [],
      settings: DEFAULT_SETTINGS,
      isInitialized: false,
      isLoading: false,
      error: null,
      worker: null,
      activeJobs: 0,
      isServicesInitialized: false,

      initialize: async () => {
        if (get().isLoading || get().isInitialized) return;

        set({ isLoading: true, error: null });
        try {
          // Fetch settings from API
          const settingsRes = await fetch('/api/db/settings')
          const settings = await settingsRes.json()
          
          // Fetch jobs from API
          const jobsRes = await fetch('/api/db/jobs')
          const jobs = await jobsRes.json()
          
          if (!serviceManager.hasOCRService()) {
            serviceManager.initializeOCRService(settings.ocr);
          }

          const worker = new ProcessingWorker();

          set({ 
            jobs, 
            settings,
            worker,
            isInitialized: true,
            isLoading: false,
            isServicesInitialized: true,
            error: null
          });
        } catch (error) {
          console.error('Failed to initialize store:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize application',
            isLoading: false,
            isInitialized: false,
            isServicesInitialized: false
          });
        }
      },

      updateSettings: async (updates) => {
        const { settings } = get();
        if (!settings) return;

        set({ isLoading: true, error: null });
        try {
          const newSettings = {
            ...settings,
            ...updates,
            ocr: { ...settings.ocr, ...updates.ocr },
            processing: { ...settings.processing, ...updates.processing },
            upload: { ...settings.upload, ...updates.upload },
            display: { ...settings.display, ...updates.display }
          };
          
          const res = await fetch('/api/db/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
          })
          
          if (!res.ok) throw new Error('Failed to update settings')
          
          const savedSettings = await res.json()
          set({ settings: savedSettings, isLoading: false });
        } catch (error) {
          console.error('Failed to update settings:', error);
          set({ 
            error: 'Failed to update settings',
            isLoading: false 
          });
        }
      },

      updateOCRProvider: async (provider) => {
        const { settings } = get();
        if (!settings) return;

        set({ isLoading: true, error: null });
        try {
          const newSettings = {
            ...settings,
            ocr: {
              ...settings.ocr,
              provider,
              model: ""
            }
          };
          
          const res = await fetch('/api/db/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
          })
          
          if (!res.ok) throw new Error('Failed to update OCR provider')
          
          const savedSettings = await res.json()
          set({ settings: savedSettings, isLoading: false });
        } catch (error) {
          console.error('Failed to update OCR provider:', error);
          set({ 
            error: 'Failed to update OCR provider',
            isLoading: false 
          });
        }
      },

      updateAPIKey: async (provider, apiKey) => {
        const { settings } = get();
        if (!settings) return;

        set({ isLoading: true, error: null });
        try {
          const newSettings = {
            ...settings,
            ocr: {
              ...settings.ocr,
              apiKeys: {
                ...settings.ocr.apiKeys,
                [provider]: apiKey
              }
            }
          };
          
          const res = await fetch('/api/db/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
          })
          
          if (!res.ok) throw new Error('Failed to update API key')
          
          const savedSettings = await res.json()
          set({ settings: savedSettings, isLoading: false });
        } catch (error) {
          console.error('Failed to update API key:', error);
          set({ 
            error: 'Failed to update API key',
            isLoading: false 
          });
        }
      },

      addJob: async (job) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/db/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job)
          })
          
          if (!res.ok) throw new Error('Failed to add job')
          
          const jobs = await res.json()
          
          // Get the worker instance and add the job to it
          const { worker } = get();
          if (worker) {
            worker.addJob(job);
          } else {
            console.error('Worker not initialized');
            throw new Error('Processing worker not initialized');
          }
          
          set({ jobs, isLoading: false });
        } catch (error) {
          console.error('Failed to add job:', error);
          set({ 
            error: 'Failed to add job',
            isLoading: false 
          });
        }
      },

      updateJob: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/db/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates })
          })
          
          if (!res.ok) throw new Error('Failed to update job')
          
          const jobs = await res.json()
          set({ jobs, isLoading: false });
        } catch (error) {
          console.error('Failed to update job:', error);
          set({ 
            error: 'Failed to update job',
            isLoading: false 
          });
        }
      },

      removeJob: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/db/jobs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          })
          
          if (!res.ok) throw new Error('Failed to delete job')
          
          const jobs = await res.json()
          set({ jobs, isLoading: false });
        } catch (error) {
          console.error('Failed to remove job:', error);
          set({ 
            error: 'Failed to remove job',
            isLoading: false 
          });
        }
      },

      deleteJob: (jobId) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId)
        }))
      },

      processImage: async (imageData, settings, pageNumber = 1) => {
        try {
          const result = await processImageAction(imageData, settings) as OCRResult;
          if (result.success && result.text && result.metadata) {
            // Cache the result
            const job: ProcessingJob = {
              id: crypto.randomUUID(),
              fileName: `Page ${pageNumber}`,
              fileType: "image",
              fileSize: result.metadata.sizeInBytes,
              totalPages: 1,
              processedPages: 1,
              status: "completed",
              progress: 100,
              result: result.text,
              metadata: result.metadata,
              createdAt: new Date(),
              details: [{
                stage: "OCR",
                message: "Completed",
                timestamp: new Date(),
              }]
            };

            // Save job via API
            await fetch('/api/db/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(job)
            })

            // Save page result via API
            await fetch('/api/db/pages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId: job.id,
                pageNumber,
                text: result.text,
                metadata: {
                  width: result.metadata.width,
                  height: result.metadata.height,
                  dpi: result.metadata.dpi,
                  orientation: result.metadata.orientation,
                },
                createdAt: new Date(),
              })
            })
          }
          return result;
        } catch (error) {
          console.error('Error processing image:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process image'
          };
        }
      },

      getPageResults: async (jobId: string) => {
        const res = await fetch(`/api/db/pages?jobId=${jobId}`)
        const results = await res.json()
        return results.reduce((acc: Record<number, string>, result: any) => ({
          ...acc,
          [result.pageNumber]: result.text
        }), {});
      },

      getPageResult: async (jobId: string, pageNumber: number) => {
        const res = await fetch(`/api/db/pages?jobId=${jobId}&pageNumber=${pageNumber}`)
        const result = await res.json()
        return result?.text;
      },

      savePageResult: async (jobId: string, pageNumber: number, text: string, metadata?: ProcessingMetadata) => {
        await fetch('/api/db/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            pageNumber,
            text,
            metadata: metadata ? {
              width: metadata.width,
              height: metadata.height,
              dpi: metadata.dpi,
              orientation: metadata.orientation,
            } : undefined,
            createdAt: new Date(),
          })
        })
      }
    }),
    {
      name: "ocr-store",
      partialize: (state) => ({
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialize();
        }
      }
    }
  )
);

