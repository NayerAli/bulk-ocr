"use client"

import { useState } from "react"
import { Upload, File, ImageIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useStore } from "@/lib/stores/store"
import { formatFileSize } from "@/lib/utils"
import type { CachedFile } from "@/lib/services/database-types"

type MimeTypes = 
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/tiff'
  | 'image/bmp'

// MIME type mapping
const ALLOWED_MIME_TYPES: Record<MimeTypes, boolean> = {
  'application/pdf': true,
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/tiff': true,
  'image/bmp': true
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']

export function FileUpload() {
  const { settings, isInitialized, addJob } = useStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > settings.upload.maxFileSize) {
      return `File too large: ${file.name}. Maximum size is ${formatFileSize(settings.upload.maxFileSize)}`
    }

    // Get file extension and normalize MIME type
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
    const normalizedType = file.type.toLowerCase()

    // Check file extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type not supported. Please use files with these extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES[normalizedType as MimeTypes]) {
      // Special handling for JPEG variations
      if ((normalizedType === 'image/jpg' || normalizedType === 'image/jpeg') && 
          (ext === '.jpg' || ext === '.jpeg')) {
        return null
      }
      return `File type ${file.type} is not supported. Please use supported file types.`
    }

    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      let processed = 0
      for (const file of files) {
        // Validate file
        const validationError = validateFile(file)
        if (validationError) {
          throw new Error(validationError)
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to upload ${file.name}`)
        }

        // Add job to processing queue
        await addJob({
          id: result.id,
          fileName: file.name,
          fileType: file.type.startsWith('application/pdf') ? 'pdf' : 'image',
          fileSize: file.size,
          totalPages: result.totalPages || 1,
          processedPages: 0,
          status: 'queued',
          progress: 0,
          file: {
            id: result.id,
            name: file.name,
            type: file.type,
            size: file.size,
            path: result.filePath,
            uploadedAt: new Date()
          },
          createdAt: new Date(),
          details: [{
            stage: 'upload',
            message: 'File uploaded successfully',
            timestamp: new Date()
          }]
        })

        processed++
        setProgress(Math.round((processed / files.length) * 100))
      }

      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)
    } catch (error) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "Failed to upload file")
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-8 border rounded-lg bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <File className="w-4 h-4 mr-1" />
                    PDF
                  </div>
                  <div className="flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1" />
                    JPG, PNG, TIFF, BMP
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Up to {formatFileSize(settings.upload.maxFileSize)}</p>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.bmp"
                onChange={handleFileChange}
                disabled={uploading || !isInitialized}
              />
            </label>
          </div>
          {uploading && (
            <div className="w-full">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2 text-center">{progress.toFixed(0)}% uploaded</p>
            </div>
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

