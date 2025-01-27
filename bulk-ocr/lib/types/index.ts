// OCR Types
export type OCRProvider = "claude" | "openai"
export type ProcessingStatus = "queued" | "analyzing" | "converting" | "processing" | "completed" | "failed"
export type FileType = "pdf" | "image"

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
  details: ProcessingDetail[]
}

export interface ProcessingDetail {
  stage: string
  message: string
  timestamp: Date
  confidence?: number
}

// Settings Types
export interface OCRSettings {
  provider: OCRProvider
  apiKeys: {
    claude?: string
    openai?: string
  }
  language: "arabic" | "persian"
  confidence: number
  retryAttempts: number
  retryDelay: number
}

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

// Error Types
export class ProcessingError extends Error {
  constructor(
    message: string,
    public details?: any,
    public jobId?: string,
  ) {
    super(message)
    this.name = "ProcessingError"
  }
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

