export type FileType = "pdf" | "image"
export type ProcessingStatus = "queued" | "analyzing" | "converting" | "processing" | "completed" | "failed"

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

