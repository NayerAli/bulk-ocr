import { create } from "zustand"
import type { ProcessingJob } from "../types/settings"
import type { SystemMetrics } from "../types/metrics"

interface MetricsStore {
  metrics: SystemMetrics
  history: SystemMetrics[]
  updateMetrics: (jobs: ProcessingJob[]) => void
  getHistoricalData: (timeframe: "hour" | "day" | "week") => SystemMetrics[]
}

const calculateMetrics = (jobs: ProcessingJob[]): SystemMetrics => {
  const now = new Date()
  const completedJobs = jobs.filter((job) => job.status === "completed")
  const failedJobs = jobs.filter((job) => job.status === "failed")
  const activeJobs = jobs.filter((job) => ["processing", "analyzing", "converting"].includes(job.status))

  // Calculate processing metrics
  const processing = {
    totalProcessed: completedJobs.length,
    totalPages: jobs.reduce((acc, job) => acc + job.totalPages, 0),
    totalSize: jobs.reduce((acc, job) => acc + job.fileSize, 0),
    averageTimePerPage:
      completedJobs.length > 0
        ? completedJobs.reduce((acc, job) => {
            const duration = job.completedAt!.getTime() - job.startedAt!.getTime()
            return acc + duration / job.totalPages
          }, 0) / completedJobs.length
        : 0,
    averageTimePerDocument:
      completedJobs.length > 0
        ? completedJobs.reduce((acc, job) => {
            const duration = job.completedAt!.getTime() - job.startedAt!.getTime()
            return acc + duration
          }, 0) / completedJobs.length
        : 0,
    successRate: jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0,
    errorRate: jobs.length > 0 ? (failedJobs.length / jobs.length) * 100 : 0,
    throughput: calculateThroughput(completedJobs),
    queueLength: jobs.filter((job) => job.status === "queued").length,
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    failedJobs: failedJobs.length,
  }

  // Calculate performance metrics
  const performance = {
    cpuUsage: calculateCPUUsage(),
    memoryUsage: calculateMemoryUsage(),
    queueLatency: calculateQueueLatency(jobs),
    processingLatency: calculateProcessingLatency(completedJobs),
    apiLatency: calculateAPILatency(jobs),
  }

  // Calculate quality metrics
  const quality = {
    averageConfidence: calculateAverageConfidence(completedJobs),
    errorDistribution: calculateErrorDistribution(failedJobs),
    successByFileType: calculateSuccessByFileType(completedJobs),
    averageRetries: calculateAverageRetries(jobs),
  }

  return {
    processing,
    performance,
    quality,
    timestamp: now,
  }
}

// Helper functions for metrics calculations
function calculateThroughput(completedJobs: ProcessingJob[]): number {
  const recentJobs = completedJobs.filter((job) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return job.completedAt && job.completedAt > fiveMinutesAgo
  })

  if (recentJobs.length === 0) return 0

  const totalPages = recentJobs.reduce((acc, job) => acc + job.totalPages, 0)
  return totalPages / 5 // pages per minute
}

function calculateCPUUsage(): number {
  // In a real implementation, this would use system metrics
  return Math.random() * 100
}

function calculateMemoryUsage(): number {
  // In a real implementation, this would use system metrics
  return Math.random() * 100
}

function calculateQueueLatency(jobs: ProcessingJob[]): number {
  const queuedJobs = jobs.filter((job) => job.status !== "queued" && job.startedAt && job.createdAt)

  if (queuedJobs.length === 0) return 0

  return (
    queuedJobs.reduce((acc, job) => acc + (job.startedAt!.getTime() - job.createdAt.getTime()), 0) / queuedJobs.length
  )
}

function calculateProcessingLatency(completedJobs: ProcessingJob[]): number {
  if (completedJobs.length === 0) return 0

  return (
    completedJobs.reduce((acc, job) => acc + (job.completedAt!.getTime() - job.startedAt!.getTime()), 0) /
    completedJobs.length
  )
}

function calculateAPILatency(jobs: ProcessingJob[]): Record<string, number> {
  const latencies: Record<string, number[]> = {}

  jobs.forEach((job) => {
    job.details.forEach((detail, index) => {
      if (detail.stage === "processing" && index > 0) {
        const prevTimestamp = job.details[index - 1].timestamp
        const latency = detail.timestamp.getTime() - prevTimestamp.getTime()

        if (!latencies[job.fileType]) {
          latencies[job.fileType] = []
        }
        latencies[job.fileType].push(latency)
      }
    })
  })

  return Object.entries(latencies).reduce(
    (acc, [type, values]) => ({
      ...acc,
      [type]: values.reduce((sum, val) => sum + val, 0) / values.length,
    }),
    {},
  )
}

function calculateAverageConfidence(completedJobs: ProcessingJob[]): number {
  if (completedJobs.length === 0) return 0

  return (
    completedJobs.reduce((acc, job) => {
      const confidenceDetails = job.details.find((d) => d.stage === "processing" && d.confidence !== undefined)
      return acc + (confidenceDetails?.confidence || 0)
    }, 0) / completedJobs.length
  )
}

function calculateErrorDistribution(failedJobs: ProcessingJob[]): Record<string, number> {
  const distribution: Record<string, number> = {}

  failedJobs.forEach((job) => {
    const error = job.error || "Unknown error"
    distribution[error] = (distribution[error] || 0) + 1
  })

  return distribution
}

function calculateSuccessByFileType(completedJobs: ProcessingJob[]): Record<string, number> {
  const success: Record<string, number> = {}

  completedJobs.forEach((job) => {
    success[job.fileType] = (success[job.fileType] || 0) + 1
  })

  return success
}

function calculateAverageRetries(jobs: ProcessingJob[]): number {
  const jobsWithRetries = jobs.filter((job) => job.details.filter((d) => d.stage === "retry").length > 0)

  if (jobsWithRetries.length === 0) return 0

  return (
    jobsWithRetries.reduce((acc, job) => acc + job.details.filter((d) => d.stage === "retry").length, 0) /
    jobsWithRetries.length
  )
}

export const useMetrics = create<MetricsStore>((set, get) => ({
  metrics: {
    processing: {
      totalProcessed: 0,
      totalPages: 0,
      totalSize: 0,
      averageTimePerPage: 0,
      averageTimePerDocument: 0,
      successRate: 0,
      errorRate: 0,
      throughput: 0,
      queueLength: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    },
    performance: {
      cpuUsage: 0,
      memoryUsage: 0,
      queueLatency: 0,
      processingLatency: 0,
      apiLatency: {},
    },
    quality: {
      averageConfidence: 0,
      errorDistribution: {},
      successByFileType: {},
      averageRetries: 0,
    },
    timestamp: new Date(),
  },
  history: [],
  updateMetrics: (jobs) => {
    const newMetrics = calculateMetrics(jobs)
    set((state) => ({
      metrics: newMetrics,
      history: [...state.history, newMetrics].slice(-720), // Keep last 720 data points (1 hour at 5s intervals)
    }))
  },
  getHistoricalData: (timeframe) => {
    const { history } = get()
    const now = Date.now()

    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    }

    return history.filter((metric) => now - metric.timestamp.getTime() <= timeframes[timeframe])
  },
}))

