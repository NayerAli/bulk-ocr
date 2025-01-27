import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppSettings, ProcessingJob, SystemMetrics, OCRProvider, ProcessingMetadata } from "../types"
import { serviceManager } from "../services/service-manager"
import { ProcessingWorker } from "../services/processing-worker"
import { processImage as processImageAction } from "../actions/ocr-actions"
import { db } from "../services/db"

interface Store {
  // Settings
  settings: AppSettings
  updateSettings: (newSettings: Partial<AppSettings>) => void
  updateOCRProvider: (provider: OCRProvider) => void
  updateAPIKey: (provider: OCRProvider, apiKey: string) => void

  // Processing
  worker: ProcessingWorker | null
  jobs: ProcessingJob[]
  activeJobs: number
  addJob: (job: ProcessingJob) => void
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void
  removeJob: (jobId: string) => void
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

  // Services
  initializeServices: () => void
  isServicesInitialized: boolean
}

interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: ProcessingMetadata;
}

const DEFAULT_SETTINGS: AppSettings = {
  ocr: {
    provider: "claude",
    model: "claude-3-opus-20240229",
    language: "arabic",
    retryAttempts: 3,
    retryDelay: 1000,
    confidence: 0.8,
    apiKeys: {},
  },
  processing: {
    maxConcurrentJobs: 3,
    chunkSize: 10,
    concurrentChunks: 3,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedFileTypes: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSimultaneousUploads: 5,
  },
  display: {
    recentDocsCount: 10,
    dashboardRefreshRate: 5000,
    theme: "system",
    dateFormat: "PP",
    timeFormat: "pp",
  },
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: async (newSettings) => {
        const settings = {
          ...get().settings,
          ...newSettings,
        }
        await db.saveSettings(settings)
        set({ settings })
      },
      updateOCRProvider: async (provider) => {
        const settings = {
          ...get().settings,
          ocr: {
            ...get().settings.ocr,
            provider,
            apiKeys: {
              ...get().settings.ocr.apiKeys,
              [provider]: ""
            },
            model: ""
          },
        }
        await db.saveSettings(settings)
        set({ settings })
      },
      updateAPIKey: async (provider, apiKey) => {
        const settings = {
          ...get().settings,
          ocr: {
            ...get().settings.ocr,
            apiKeys: {
              ...get().settings.ocr.apiKeys,
              [provider]: apiKey
            },
          },
        }
        await db.saveSettings(settings)
        set({ settings })
      },

      // Processing
      worker: null,
      jobs: [],
      activeJobs: 0,
      processImage: async (imageData, settings, pageNumber = 1) => {
        try {
          const result = await processImageAction(imageData, settings) as OCRResult
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
            }
            await db.saveJob(job)

            // Save page result
            await db.savePageResult({
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
          }
          return result
        } catch (error) {
          console.error('Error processing image:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process image'
          }
        }
      },
      isServicesInitialized: false,

      addJob: async (job) => {
        const { worker, isServicesInitialized } = get()
        if (!isServicesInitialized) {
          console.error('Services not initialized')
          return
        }
        if (!worker) {
          console.error('Processing worker not initialized')
          return
        }

        await db.saveJob(job)
        set((state) => ({
          jobs: [...state.jobs, job],
          activeJobs: state.activeJobs + 1,
        }))
        
        worker.addJob(job)
      },

      updateJob: async (jobId, updates) => {
        await db.updateJob(jobId, updates)
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
          activeJobs:
            updates.status === "completed" || updates.status === "failed" ? state.activeJobs - 1 : state.activeJobs,
        }))
      },

      removeJob: async (jobId) => {
        await db.deleteFile(jobId)
        await db.deletePageResults(jobId)
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId),
          activeJobs: state.activeJobs - 1,
        }))
      },

      // Page Results
      getPageResults: async (jobId: string) => {
        const results = await db.getPageResults(jobId)
        return results.reduce((acc, result) => ({
          ...acc,
          [result.pageNumber]: result.text
        }), {})
      },

      getPageResult: async (jobId: string, pageNumber: number) => {
        const result = await db.getPageResult(jobId, pageNumber)
        return result?.text
      },

      savePageResult: async (jobId: string, pageNumber: number, text: string, metadata?: ProcessingMetadata) => {
        await db.savePageResult({
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
      },

      // Services initialization
      initializeServices: async () => {
        const { settings, worker } = get()
        let needsUpdate = false
        
        // Load settings from IndexedDB
        const savedSettings = await db.getSettings()
        if (savedSettings) {
          set({ settings: savedSettings })
        }
        
        // Load jobs from IndexedDB
        const savedJobs = await db.getJobs()
        set({ jobs: savedJobs })
        
        // Initialize OCR service if needed
        if (!serviceManager.hasOCRService()) {
          serviceManager.initializeOCRService(settings.ocr)
          needsUpdate = true
        }
        
        // Initialize processing worker if needed
        if (!worker) {
          needsUpdate = true
        }

        if (needsUpdate) {
          set({ 
            worker: new ProcessingWorker(),
            isServicesInitialized: true
          })
        }

        // Cleanup old data (older than 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        await db.cleanup(thirtyDaysAgo)
      },
    }),
    {
      name: "ocr-store",
      partialize: (state) => ({
        settings: state.settings,
      }),
    },
  ),
)

