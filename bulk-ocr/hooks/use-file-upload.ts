import { useCallback } from 'react'
import { useUploadStore } from '@/lib/stores/upload-store'
import { useStore } from '@/lib/stores/store'
import type { MimeType } from '@/lib/types/settings'
import { formatFileSize } from '@/lib/utils'

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']

export function useFileUpload() {
  const { settings, isInitialized, addJob } = useStore()
  const { 
    files,
    isUploading,
    progress,
    error,
    addFiles,
    removeFile,
    updateFileProgress,
    setFileError,
    setFileStatus,
    reset
  } = useUploadStore()

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > settings.upload.maxFileSize) {
      return `File ${file.name} exceeds maximum size of ${formatFileSize(settings.upload.maxFileSize)}`
    }
    
    if (!settings.upload.allowedFileTypes.includes(file.type as MimeType)) {
      return `File type ${file.type} is not supported. Please use files with these extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    
    return null
  }, [settings.upload.maxFileSize, settings.upload.allowedFileTypes])

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload ${file.name}`)
    }

    return response.json()
  }, [])

  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!isInitialized) {
      throw new Error('System not initialized. Please try again.')
    }

    if (acceptedFiles.length === 0) return

    // Add files to store
    addFiles(acceptedFiles)

    try {
      // Validate all files first
      for (const file of acceptedFiles) {
        const error = validateFile(file)
        if (error) throw new Error(error)
      }

      // Process files in chunks
      const chunks = []
      for (let i = 0; i < acceptedFiles.length; i += settings.upload.maxSimultaneousUploads) {
        chunks.push(acceptedFiles.slice(i, i + settings.upload.maxSimultaneousUploads))
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (file) => {
          const fileId = files.find(f => f.file === file)?.id
          if (!fileId) return

          try {
            setFileStatus(fileId, 'uploading')
            const result = await uploadFile(file)
            
            await addJob({
              id: result.id,
              fileName: file.name,
              fileType: file.type.startsWith('application/pdf') ? 'pdf' : 'image',
              fileSize: file.size,
              totalPages: result.totalPages || 1,
              processedPages: 0,
              status: 'queued',
              progress: 0,
              createdAt: new Date(),
              details: [{
                stage: 'upload',
                message: 'File uploaded successfully',
                timestamp: new Date()
              }]
            })

            setFileStatus(fileId, 'success')
            updateFileProgress(fileId, 100)
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error)
            setFileError(fileId, error instanceof Error ? error.message : 'Upload failed')
            throw error
          }
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }, [
    isInitialized,
    settings.upload.maxSimultaneousUploads,
    files,
    addFiles,
    validateFile,
    uploadFile,
    setFileStatus,
    setFileError,
    updateFileProgress,
    addJob
  ])

  return {
    files,
    isUploading,
    progress,
    error,
    handleUpload,
    removeFile,
    reset
  }
} 