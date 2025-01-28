import type { ProcessingJob, ProcessingStatus } from "../types"
import { ProcessingError } from "../types"
import { useStore } from "../stores/store"
import { serviceManager } from "./service-manager"
import { processImage } from "../actions/ocr-actions"
import { processImageForOCR } from "@/lib/utils/image-processing"
import path from "path"

const CHUNK_SIZE = 10 // Process 10 pages at a time
const CONCURRENT_CHUNKS = 3 // Process 3 chunks concurrently

export class ProcessingWorker {
  private queue: ProcessingJob[] = []
  private processing = false

  constructor() {
    // No initialization in constructor to avoid circular dependency
  }

  addJob(job: ProcessingJob) {
    if (!job || !job.id) {
      throw new ProcessingError("Invalid job object")
    }

    this.queue.push(job)
    if (!this.processing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const job = this.queue[0]

    try {
      await this.processJob(job)
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error)
      this.updateJob(job.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: [
          ...job.details,
          {
            stage: "error",
            message: "Processing failed",
            timestamp: new Date(),
          },
        ],
      })
    }

    this.queue.shift()
    this.processQueue()
  }

  private async processJob(job: ProcessingJob) {
    // Update status to analyzing
    this.updateJobStatus(job.id, "analyzing", "Analyzing document structure")

    // For PDFs, split into chunks
    const chunks = this.createChunks(job.totalPages)
    let processedPages = 0

    // Process chunks concurrently
    for (let i = 0; i < chunks.length; i += CONCURRENT_CHUNKS) {
      const currentChunks = chunks.slice(i, i + CONCURRENT_CHUNKS)

      this.updateJobStatus(
        job.id,
        "processing",
        `Processing pages ${i * CHUNK_SIZE + 1} to ${Math.min((i + CONCURRENT_CHUNKS) * CHUNK_SIZE, job.totalPages)}`,
      )

      await Promise.all(
        currentChunks.map(async (chunk) => {
          const results = await this.processChunk(job, chunk)
          processedPages += results.length

          // Update progress
          const progress = (processedPages / job.totalPages) * 100
          this.updateJob(job.id, {
            processedPages,
            progress,
            details: [
              ...job.details,
              {
                stage: "progress",
                message: `Processed ${processedPages} of ${job.totalPages} pages`,
                timestamp: new Date(),
              },
            ],
          })
        }),
      )
    }

    // Mark job as completed
    this.updateJob(job.id, {
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
  }

  private createChunks(totalPages: number): number[][] {
    const chunks: number[][] = []
    for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
      chunks.push(Array.from({ length: Math.min(CHUNK_SIZE, totalPages - i) }, (_, index) => i + index + 1))
    }
    return chunks
  }

  private async processChunk(job: ProcessingJob, pageNumbers: number[]) {
    const store = useStore.getState()
    const settings = store.settings

    if (!job.fileName) {
      throw new Error('No file name available for processing')
    }

    // Process each page in the chunk
    const results = await Promise.all(
      pageNumbers.map(async (pageNumber) => {
        try {
          // Get the image path for this page
          const imagePath = path.join('data', 'uploads', job.fileName)

          // Process the image
          const processedData = await processImageForOCR({ 
            id: job.id,
            name: job.fileName,
            type: job.fileType,
            size: job.fileSize,
            path: imagePath,
            uploadedAt: job.createdAt
          })

          // Use the server action for OCR processing
          const result = await processImage(processedData, settings)
          
          // Handle success case with metadata
          if (result.success && 'text' in result && result.text) {
            // Save the page result with image path
            await store.savePageResult(job.id, pageNumber, result.text, {
              ...result.metadata,
              imagePath
            })
            
            return {
              pageNumber,
              text: result.text,
            }
          }
          
          // Handle error case
          throw new Error(result.error || 'No text generated')
        } catch (error) {
          throw new Error(`Failed to process page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }),
    )

    return results
  }

  private updateJobStatus(jobId: string, status: ProcessingStatus, message: string) {
    this.updateJob(jobId, {
      status,
      details: [
        ...this.queue[0].details,
        {
          stage: status,
          message,
          timestamp: new Date(),
        },
      ],
    })
  }

  private updateJob(jobId: string, updates: Partial<ProcessingJob>) {
    // Update local queue
    const jobIndex = this.queue.findIndex((job) => job.id === jobId)
    if (jobIndex !== -1) {
      this.queue[jobIndex] = {
        ...this.queue[jobIndex],
        ...updates,
      }
    }

    // Update global store
    useStore.getState().updateJob(jobId, updates)
  }
}

