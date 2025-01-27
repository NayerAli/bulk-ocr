// Basic types
export type FileType = "pdf" | "image"

export type ProcessingStatus = "queued" | "analyzing" | "converting" | "processing" | "completed" | "failed"

// OCR related types
export interface OCRSettings {
  provider: "claude" | "openai"
  apiKeys: {
    claude?: string
    openai?: string
  }
  language: string
  retryAttempts: number
  retryDelay: number
}

// Processing related types
export interface ProcessingJob {
  id: string
  fileName: string
  fileType: FileType
  fileSize: number
  totalPages: number
  processedPages: number
  status: ProcessingStatus
  progress: number
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  details: {
    stage: string
    message: string
    timestamp: Date
  }[]
}

// Queue related types
export interface Job {
  id: string
  fileName: string
  totalPages: number
  processedPages: number
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  error?: string
  createdAt: Date
}

// Error types
export class ProcessingError extends Error {
  details?: Record<string, any>

  constructor(message: string, details?: Record<string, any>) {
    super(message)
    this.name = "ProcessingError"
    this.details = details
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProcessingError)
    }
  }
}

// OCR Types
export type OCRProvider = "claude" | "openai"

export interface ProcessingDetail {
  stage: string
  message: string
  timestamp: Date
  confidence?: number
}

// Settings Types
export interface ProcessingSettings {
  maxConcurrentJobs: number
  chunkSize: number
  concurrentChunks: number
  retryAttempts: number
  retryDelay: number
}

export interface UploadSettings {
  maxFileSize: number
  allowedFileTypes: string[]
  maxSimultaneousUploads: number
}

export interface DisplaySettings {
  recentDocsCount: number
  dashboardRefreshRate: number
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

// Metrics Types
export interface ProcessingMetrics {
  totalProcessed: number
  totalPages: number
  totalSize: number
  averageTimePerPage: number
  averageTimePerDocument: number
  successRate: number
  errorRate: number
  throughput: number
  queueLength: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
}

export interface SystemMetrics {
  processing: ProcessingMetrics
  timestamp: Date
}

