import { create } from "zustand"
import { persist, PersistOptions, StorageValue } from "zustand/middleware"
import type { AppSettings, OCRProvider, MimeType } from "../types/settings"
import db from "@/lib/services/db"
import type { StateCreator } from "zustand"

interface SettingsStore {
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  updateOCRProvider: (provider: OCRProvider) => Promise<void>
  updateAPIKey: (provider: OCRProvider, apiKey: string) => Promise<void>
}

export const DEFAULT_SETTINGS: AppSettings = {
  ocr: {
    provider: "claude",
    model: "",
    apiKeys: {},
    language: "eng",
    confidence: 0.8,
    retryAttempts: 3,
    retryDelay: 1000,
    isTestMode: false,
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
      "application/x-pdf",
      "application/acrobat",
      "applications/vnd.pdf",
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
      "image/x-citrix-jpeg",
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

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  updateOCRProvider: (provider: OCRProvider) => Promise<void>
  updateAPIKey: (provider: OCRProvider, apiKey: string) => Promise<void>
}

type SettingsPersist = (
  config: StateCreator<SettingsState>,
  options: PersistOptions<SettingsState>
) => StateCreator<SettingsState>

// Custom storage adapter for database persistence
const dbStorage = {
  getItem: async (name: string): Promise<StorageValue<SettingsState> | null> => {
    try {
      const settings = await db.getSettings()
      if (!settings) return null
      
      // Return the exact shape that Zustand expects
      const state: SettingsState = {
        settings,
        isLoading: false,
        error: null,
        loadSettings: async () => {},
        saveSettings: async () => {},
        updateSettings: async () => {},
        resetSettings: async () => {},
        updateOCRProvider: async () => {},
        updateAPIKey: async () => {}
      }
      return { state }
    } catch (error) {
      console.error('Error loading settings:', error)
      return null
    }
  },
  setItem: async (name: string, value: StorageValue<SettingsState>): Promise<void> => {
    try {
      await db.saveSettings(value.state.settings)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await db.saveSettings(DEFAULT_SETTINGS)
    } catch (error) {
      console.error('Error resetting settings:', error)
    }
  }
}

export const useSettingsStore = create<SettingsState>()(
  (persist as SettingsPersist)(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      loadSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const settings = await db.getSettings()
          if (settings) {
            set({ settings })
          }
        } catch (error) {
          console.error('Error loading settings:', error)
          set({ error: 'Failed to load settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      saveSettings: async (settings: AppSettings) => {
        set({ isLoading: true, error: null })
        try {
          await db.saveSettings(settings)
          set({ settings })
        } catch (error) {
          console.error('Error saving settings:', error)
          set({ error: 'Failed to save settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      updateSettings: async (updates: Partial<AppSettings>) => {
        const currentSettings = get().settings
        const newSettings = {
          ...currentSettings,
          ...updates,
          // Merge nested objects
          ocr: { ...currentSettings.ocr, ...updates.ocr },
          processing: { ...currentSettings.processing, ...updates.processing },
          upload: { ...currentSettings.upload, ...updates.upload },
          display: { ...currentSettings.display, ...updates.display }
        }
        await get().saveSettings(newSettings)
      },

      resetSettings: async () => {
        await get().saveSettings(DEFAULT_SETTINGS)
      },

      updateOCRProvider: async (provider: OCRProvider) => {
        const currentSettings = get().settings
        const newSettings = {
          ...currentSettings,
          ocr: {
            ...currentSettings.ocr,
            provider,
            model: ""
          }
        }
        await get().saveSettings(newSettings)
      },

      updateAPIKey: async (provider: OCRProvider, apiKey: string) => {
        const currentSettings = get().settings
        const newSettings = {
          ...currentSettings,
          ocr: {
            ...currentSettings.ocr,
            apiKeys: {
              ...currentSettings.ocr.apiKeys,
              [provider]: apiKey
            }
          }
        }
        await get().saveSettings(newSettings)
      },
    }),
    {
      name: "settings-storage",
      storage: dbStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loadSettings()
        }
      }
    }
  )
)

