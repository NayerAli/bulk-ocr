import type { ProcessingJob, ProcessingStatus } from "../types/settings"
import { OCRService } from "./ocr-service"
import { useSettings } from "../stores/settings-store"
import { useProcessingStore } from "../stores/processing-store"

class ProcessingError extends Error {
  constructor(
    message: string,
    public details?: any,
  ) {
    super(message)
    this.name = "ProcessingError"
  }
}

export class ProcessingWorker {
  private queue: ProcessingJob[] = []
  private processing = false
  private ocrService: OCRService
  private settings: ReturnType<typeof useSettings.getState>["settings"]

  constructor() {
    try {
      this.settings = useSettings.getState().settings
      this.ocrService = new OCRService(this.settings.ocr)

      // Subscribe to settings changes
      useSettings.subscribe((state) => {
        this.settings = state.settings
        this.ocrService = new OCRService(state.settings.ocr)
      })
    } catch (error) {
      throw new ProcessingError("Failed to initialize ProcessingWorker", { error })
    }
  }

  addJob(job: ProcessingJob) {
    if (!job || !job.id) {
      throw new ProcessingError("Invalid job object")
    }

    this.queue.push(job)
    if (!this.processing) {
      this.startProcessing(job.id).catch((error) => {
        console.error("Failed to start processing:", error)
        this.handleError(job.id, error)
      })
    }
  }

  private async startProcessing(jobId: string) {
    try {
      this.processing = true
      await this.processQueue()
    } catch (error) {
      this.handleError(jobId, error)
    } finally {
      this.processing = false
      // Check if there are more jobs to process
      if (this.queue.length > 0) {
        const nextJob = this.queue[0]
        this.startProcessing(nextJob.id).catch(console.error)
      }
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      return
    }

    const job = this.queue[0]
    if (!job) {
      throw new ProcessingError("No job found in queue")
    }

    try {
      // Log the current state
      console.log("Starting job processing:", {
        jobId: job.id,
        status: job.status,
        fileName: job.fileName,
      })

      // Validate OCR configuration
      await this.ocrService.validateConfiguration()

      // Update job status
      await this.updateJob(job.id, {
        status: "processing",
        startedAt: new Date(),
        details: [
          ...job.details,
          {
            stage: "started",
            message: "Starting document processing",
            timestamp: new Date(),
          },
        ],
      })

      await this.processJob(job)

      // Remove the completed job from the queue
      this.queue.shift()
    } catch (error) {
      this.handleError(job.id, error)
      // Remove the failed job from the queue
      this.queue.shift()
      throw error // Re-throw to trigger error handling in startProcessing
    }
  }

  private async processJob(job: ProcessingJob) {
    if (!job) {
      throw new ProcessingError("Invalid job object")
    }

    try {
      await this.updateJobStatus(job.id, "analyzing", "Analyzing document structure")

      const chunks = this.createChunks(job.totalPages)
      let processedPages = 0
      let failedPages = 0
      const errors: Error[] = []

      for (let i = 0; i < chunks.length; i += this.settings.processing.concurrentChunks) {
        const currentChunks = chunks.slice(i, i + this.settings.processing.concurrentChunks)

        await this.updateJobStatus(
          job.id,
          "processing",
          `Processing batch ${i + 1} of ${Math.ceil(chunks.length / this.settings.processing.concurrentChunks)}`,
        )

        const results = await Promise.allSettled(currentChunks.map((chunk) => this.processChunk(job, chunk)))

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            processedPages += result.value.length
          } else {
            failedPages++
            errors.push(result.reason)
          }
        })

        // Update progress
        const progress = (processedPages / job.totalPages) * 100
        await this.updateJob(job.id, {
          processedPages,
          progress,
          details: [
            ...job.details,
            {
              stage: "progress",
              message: `Processed ${processedPages} of ${job.totalPages} pages (${failedPages} failed)`,
              timestamp: new Date(),
            },
          ],
        })
      }

      if (failedPages > 0) {
        throw new ProcessingError(`Failed to process ${failedPages} pages`, { errors: errors.map((e) => e.message) })
      }

      await this.updateJob(job.id, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        details: [
          ...job.details,
          {
            stage: "completed",
            message: "Processing completed successfully",
            timestamp: new Date(),
          },
        ],
      })
    } catch (error) {
      throw new ProcessingError(`Failed to process job ${job.id}`, { originalError: error })
    }
  }

  private async processChunk(job: ProcessingJob, pageNumbers: number[]) {
    try {
      const results = await Promise.all(
        pageNumbers.map(async (pageNumber) => {
          try {
            console.log(`Processing page ${pageNumber} of job ${job.id}`)

            const imageData = await this.getPageImageData(job, pageNumber)
            if (!imageData) {
              throw new ProcessingError(`Failed to get image data for page ${pageNumber}`)
            }

            const result = await this.ocrService.processImage(imageData)
            if (!result.success) {
              throw new ProcessingError(`OCR processing failed for page ${pageNumber}`, { error: result.error })
            }

            return {
              pageNumber,
              text: result.text,
            }
          } catch (error) {
            throw new ProcessingError(`Failed to process page ${pageNumber}`, { originalError: error })
          }
        }),
      )

      return results
    } catch (error) {
      throw new ProcessingError("Chunk processing failed", { originalError: error })
    }
  }

  private async getPageImageData(job: ProcessingJob, pageNumber: number): Promise<string> {
    try {
      // This is a placeholder for actual page image extraction
      // In a real implementation, this would:
      // 1. Load the specific page from the PDF/image
      // 2. Convert it to an image if needed
      // 3. Return the base64 encoded image data
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    } catch (error) {
      throw new ProcessingError(`Failed to get image data for page ${pageNumber}`, { originalError: error })
    }
  }

  private createChunks(totalPages: number): number[][] {
    if (totalPages <= 0) {
      throw new ProcessingError("Invalid page count")
    }

    const chunks: number[][] = []
    const chunkSize = this.settings.processing.chunkSize

    for (let i = 0; i < totalPages; i += chunkSize) {
      chunks.push(Array.from({ length: Math.min(chunkSize, totalPages - i) }, (_, index) => i + index + 1))
    }
    return chunks
  }

  private async updateJobStatus(jobId: string, status: ProcessingStatus, message: string) {
    const job = this.queue.find((j) => j.id === jobId)
    if (!job) {
      throw new ProcessingError(`Job ${jobId} not found in queue`)
    }

    await this.updateJob(jobId, {
      status,
      details: [
        ...job.details,
        {
          stage: status,
          message,
          timestamp: new Date(),
        },
      ],
    })
  }

  private async updateJob(jobId: string, updates: Partial<ProcessingJob>) {
    try {
      const jobIndex = this.queue.findIndex((job) => job.id === jobId)
      if (jobIndex === -1) {
        throw new ProcessingError(`Job ${jobId} not found in queue`)
      }

      this.queue[jobIndex] = {
        ...this.queue[jobIndex],
        ...updates,
      }

      // Update the global processing store
      useProcessingStore.getState().updateJob(jobId, updates)
    } catch (error) {
      console.error(`Failed to update job ${jobId}:`, error)
      throw new ProcessingError(`Failed to update job ${jobId}`, { originalError: error })
    }
  }

  private handleError(jobId: string, error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof ProcessingError ? error.details : undefined

    console.error(`Processing error for job ${jobId}:`, {
      message: errorMessage,
      details: errorDetails,
      error,
    })

    this.updateJob(jobId, {
      status: "failed",
      error: errorMessage,
      details: [
        ...(this.queue[0]?.details || []),
        {
          stage: "error",
          message: `Processing failed: ${errorMessage}`,
          timestamp: new Date(),
        },
      ],
    }).catch(console.error)
  }
}

