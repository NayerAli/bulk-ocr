export type OCRProvider = "claude" | "openai"

export interface OCRSettings {
  provider: OCRProvider
  model?: string
  apiKeys: {
    claude?: string
    openai?: string
  }
  language: string
  confidence: number
  retryAttempts: number
  retryDelay: number
}

export interface ProcessingSettings {
  maxConcurrentJobs: number
  chunkSize: number // Number of pages per chunk
  concurrentChunks: number // Number of chunks to process in parallel
  retryAttempts: number
  retryDelay: number // ms
}

export interface UploadSettings {
  maxFileSize: number // bytes
  allowedFileTypes: string[]
  maxSimultaneousUploads: number
}

export interface DisplaySettings {
  recentDocsCount: number
  dashboardRefreshRate: number // ms
  theme: "light" | "dark" | "system"
  dateFormat: string
  timeFormat: string
}

export interface AppSettings {
  ocr: OCRSettings
  processing: ProcessingSettings
  upload: UploadSettings
  display: DisplaySettings
}

