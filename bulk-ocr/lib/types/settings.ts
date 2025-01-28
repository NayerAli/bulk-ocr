export type OCRProvider = "claude" | "openai"

export type MimeType = 
  | "application/pdf" 
  | "application/x-pdf"
  | "application/acrobat"
  | "applications/vnd.pdf"
  | "image/jpeg" 
  | "image/jpg" 
  | "image/pjpeg"
  | "image/x-citrix-jpeg"
  | "image/png" 
  | "image/tiff" 
  | "image/bmp"

export interface OCRSettings {
  provider: OCRProvider
  model: string
  apiKeys: {
    claude?: string
    openai?: string
  }
  language: string
  confidence: number
  retryAttempts: number
  retryDelay: number
  isTestMode?: boolean
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
  allowedFileTypes: MimeType[]
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

