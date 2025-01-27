"use client"

import { useCallback, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/lib/stores/store"
import { ValidationService } from "@/lib/services/validation-service"
import { Button } from "@/components/ui/button"
import { Settings, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { processImageForOCR } from "@/lib/utils/image-processing"
import type { FileType, ProcessingStatus, ProcessingJob } from "@/lib/types"

// Helper function to compress image
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions while maintaining aspect ratio
      const maxDimension = 2048 // Max dimension for OCR
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to blob with quality adjustment
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          // Convert Blob to File
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          })
          resolve(compressedFile)
        },
        file.type,
        0.8 // Quality setting (0.8 = 80% quality)
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image for compression'))
  })
}

// Helper function to validate base64 data URL
function isValidBase64DataUrl(dataUrl: string): boolean {
  const regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,([a-zA-Z0-9+/]+={0,2})$/
  return regex.test(dataUrl)
}

// Helper function to convert File/Blob to base64 data URL
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          throw new Error('Failed to convert file to base64: Invalid result type')
        }

        // Validate the base64 data URL format
        if (!isValidBase64DataUrl(reader.result)) {
          // If invalid, try to fix the format
          const mimeType = file.type || 'application/octet-stream'
          const base64Data = reader.result.replace(/^data:.*?;base64,/, '')
          const formattedDataUrl = `data:${mimeType};base64,${base64Data}`
          
          if (!isValidBase64DataUrl(formattedDataUrl)) {
            throw new Error('Failed to create valid base64 data URL')
          }
          
          resolve(formattedDataUrl)
        } else {
          resolve(reader.result)
        }
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown error')))
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      reject(new Error('Failed to start file reading: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })
}

export function FileUpload() {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const settings = useStore((state) => state.settings)
  const addJob = useStore((state) => state.addJob)
  const processImage = useStore((state) => state.processImage)
  const initializeServices = useStore((state) => state.initializeServices)
  const isServicesInitialized = useStore((state) => state.isServicesInitialized)

  // Initialize services on mount
  useEffect(() => {
    if (!isServicesInitialized) {
      initializeServices()
    }
  }, [isServicesInitialized, initializeServices])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check if services are initialized
    if (!isServicesInitialized) {
      toast({
        title: "Service Error",
        description: "Services are not initialized. Please try again in a moment.",
        variant: "destructive",
      })
      return
    }

    // Validate configuration first
    const configValidation = ValidationService.validateConfiguration(settings)
    if (!configValidation.isValid) {
      toast({
        title: "Configuration Error",
        description: (
          <div className="space-y-2">
            <p>Please fix the following issues before uploading files:</p>
            <ul className="list-disc pl-4">
              {configValidation.errors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error.message}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => document.getElementById("settings-dialog-trigger")?.click()}
            >
              <Settings className="mr-2 h-4 w-4" />
              Open Settings
            </Button>
          </div>
        ),
        variant: "destructive",
      })
      return
    }

    // Process each file
    for (const file of acceptedFiles) {
      const jobId = crypto.randomUUID()
      const initialJob: ProcessingJob = {
        id: jobId,
        file,
        fileName: file.name,
        fileType: file.type.includes("pdf") ? ("pdf" as FileType) : ("image" as FileType),
        fileSize: file.size,
        totalPages: 1,
        processedPages: 0,
        status: "queued" as ProcessingStatus,
        progress: 0,
        createdAt: new Date(),
        details: [
          {
            stage: "upload",
            message: "File successfully uploaded",
            timestamp: new Date(),
          },
        ],
      }

      try {
        // Validate file
        const fileValidation = ValidationService.validateFile(file, settings)
        if (!fileValidation.isValid) {
          toast({
            title: `Error Processing ${file.name}`,
            description: (
              <ul className="list-disc pl-4">
                {fileValidation.errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error.message}
                  </li>
                ))}
              </ul>
            ),
            variant: "destructive",
          })
          continue
        }

        // Add job to queue
        addJob(initialJob)

        // Update status to processing
        useStore.getState().updateJob(jobId, {
          status: "processing",
          progress: 10,
          details: [
            ...initialJob.details,
            {
              stage: "processing",
              message: "Processing file",
              timestamp: new Date(),
            },
          ],
        })

        // Process the file
        let processedData: string
        if (file.type.includes("pdf")) {
          // TODO: Implement PDF processing
          throw new Error("PDF processing not yet implemented")
        } else {
          processedData = await processImageForOCR(file)
        }

        // Update progress before OCR
        useStore.getState().updateJob(jobId, {
          progress: 50,
          details: [
            ...initialJob.details,
            {
              stage: "processing",
              message: "Starting OCR processing",
              timestamp: new Date(),
            },
          ],
        })

        // Process with OCR
        const result = await processImage(processedData, settings)

        if (!result.success) {
          throw new Error(result.error)
        }

        // Update job with results
        useStore.getState().updateJob(jobId, {
          status: "completed",
          progress: 100,
          result: result.text,
          metadata: result.metadata,
          details: [
            ...initialJob.details,
            {
              stage: "complete",
              message: "Processing completed successfully",
              timestamp: new Date(),
            },
          ],
        })
      } catch (error) {
        console.error('Processing error:', error)
        useStore.getState().updateJob(jobId, {
          status: "failed",
          error: error instanceof Error ? error.message : 'Processing failed',
          details: [
            ...initialJob.details,
            {
              stage: "error",
              message: error instanceof Error ? error.message : 'Processing failed',
              timestamp: new Date(),
            },
          ],
        })
      }
    }
  }, [settings, addJob, processImage, toast, isServicesInitialized, initializeServices])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: settings.upload.maxFileSize,
  })

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragging && "border-primary bg-primary/5",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2 text-center">
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG • Up to {settings.upload.maxFileSize / (1024 * 1024)}MB
        </p>
      </div>
    </Card>
  )
}

