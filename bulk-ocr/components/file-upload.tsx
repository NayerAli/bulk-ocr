"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/lib/stores/store"
import { ValidationService } from "@/lib/services/validation-service"
import { Button } from "@/components/ui/button"
import { Settings, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileType, ProcessingStatus } from "@/lib/types"

export function FileUpload() {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const settings = useStore((state) => state.settings)
  const addJob = useStore((state) => state.addJob)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      const job = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: file.type.includes("pdf") ? ("pdf" as FileType) : ("image" as FileType),
        fileSize: file.size,
        totalPages: 1, // Will be updated for PDFs after analysis
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

      addJob(job)
    }
  }, [settings, addJob, toast])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
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

