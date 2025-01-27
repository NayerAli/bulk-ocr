"use client"

import { useState } from "react"
import { Upload, File, ImageIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useStore } from "@/lib/stores/store"
import { formatFileSize, isValidFileType } from "@/lib/utils"
import type { ProcessingJob } from "@/lib/types"
import { ProcessingError } from "@/lib/types"

export function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { settings, addJob } = useStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      for (const file of files) {
        // Validate file type
        if (!isValidFileType(file.name)) {
          throw new ProcessingError(
            `Invalid file type: ${file.name}. Supported formats: ${settings.upload.allowedFileTypes.join(", ")}`,
          )
        }

        // Validate file size
        if (file.size > settings.upload.maxFileSize) {
          throw new ProcessingError(
            `File too large: ${file.name}. Maximum size is ${formatFileSize(settings.upload.maxFileSize)}`,
          )
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (!result.success) {
          throw new ProcessingError(result.error || "Failed to upload file")
        }

        // Add job to processing queue
        addJob({
          id: result.jobId,
          fileName: file.name,
          fileType: file.type.includes("pdf") ? "pdf" : "image",
          fileSize: file.size,
          totalPages: result.pageCount || 1,
          processedPages: 0,
          status: "queued",
          progress: 0,
          createdAt: new Date(),
          details: [
            {
              stage: "uploaded",
              message: "File successfully uploaded",
              timestamp: new Date(),
            },
          ],
        })

        setProgress((prev) => prev + 100 / files.length)
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
                    JPG, PNG
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Up to {formatFileSize(settings.upload.maxFileSize)}</p>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                accept={settings.upload.allowedFileTypes.join(",")}
                onChange={handleFileChange}
                disabled={uploading}
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

