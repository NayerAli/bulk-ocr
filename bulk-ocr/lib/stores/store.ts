import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppSettings, ProcessingJob, SystemMetrics } from "@/lib/types"
import { ProcessingWorker } from "@/lib/services/processing-worker"

interface Store {
  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  updateOCRProvider: (provider: "claude" | "openai") => void
  updateAPIKey: (provider: "claude" | "openai", apiKey: string) => void

  // Processing
  worker: ProcessingWorker
  jobs: ProcessingJob[]
  activeJobs: number
  addJob: (job: ProcessingJob) => void
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void
  removeJob: (jobId: string) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  ocr: {
    provider: "claude",
    apiKeys: {},
    language: "arabic",
    confidence: 0.8,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  processing: {
    maxConcurrentJobs: 3,
    chunkSize: 10,
    concurrentChunks: 3,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  upload: {
    maxFileSize: 500 * 1024 * 1024,
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
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        })),
      updateOCRProvider: (provider) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ocr: {
              ...state.settings.ocr,
              provider,
            },
          },
        })),
      updateAPIKey: (provider, apiKey) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ocr: {
              ...state.settings.ocr,
              apiKeys: {
                ...state.settings.ocr.apiKeys,
                [provider]: apiKey,
              },
            },
          },
        })),

      // Processing
      worker: new ProcessingWorker(),
      jobs: [],
      activeJobs: 0,
      addJob: (job) => {
        set((state) => ({
          jobs: [...state.jobs, job],
          activeJobs: state.activeJobs + 1,
        }))
        get().worker.addJob(job)
      },
      updateJob: (jobId, updates) =>
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
          activeJobs:
            updates.status === "completed" || updates.status === "failed" ? state.activeJobs - 1 : state.activeJobs,
        })),
      removeJob: (jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId),
          activeJobs: state.activeJobs - 1,
        })),
    }),
    {
      name: "ocr-store",
      partialize: (state) => ({
        settings: state.settings,
      }),
    },
  ),
)

