import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppSettings, OCRProvider } from "../types/settings"

interface SettingsStore {
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  updateOCRProvider: (provider: OCRProvider) => void
  updateAPIKey: (provider: OCRProvider, apiKey: string) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  ocr: {
    provider: "claude",
    apiKeys: {},
    language: "arabic",
    confidence: 0.8,
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

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "ocr-settings",
    },
  ),
)

