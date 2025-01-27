export interface ProcessingMetrics {
  totalProcessed: number
  totalPages: number
  totalSize: number
  averageTimePerPage: number
  averageTimePerDocument: number
  successRate: number
  errorRate: number
  throughput: number // pages per minute
  queueLength: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
}

export interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  queueLatency: number
  processingLatency: number
  apiLatency: Record<string, number>
}

export interface QualityMetrics {
  averageConfidence: number
  errorDistribution: Record<string, number>
  successByFileType: Record<string, number>
  averageRetries: number
}

export interface SystemMetrics {
  processing: ProcessingMetrics
  performance: PerformanceMetrics
  quality: QualityMetrics
  timestamp: Date
}

