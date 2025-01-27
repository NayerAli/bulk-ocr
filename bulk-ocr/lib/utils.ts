import { ProcessingError } from "./types"

// Error handling utility
export function handleError(error: unknown): Error {
  if (error instanceof ProcessingError) {
    return error
  }
  if (error instanceof Error) {
    return error
  }
  return new Error(typeof error === 'string' ? error : 'An unknown error occurred')
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) return 'N/A'
  
  return new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}

// Define the FileTypes constant first
export const FileTypes = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
} as const

// Then define the extensions map
export const FileTypeExtensions = new Map([
  [FileTypes.PDF, ['pdf']],
  [FileTypes.JPEG, ['jpg', 'jpeg']],
  [FileTypes.PNG, ['png']]
])

// Basic extension validation
export function isValidFileType(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return !!extension && Array.from(FileTypeExtensions.values())
    .flat()
    .includes(extension)
}

// Full file validation (both MIME type and extension)
export function validateFileType(file: File): boolean {
  return Object.values(FileTypes).includes(file.type as any) && 
    isValidFileType(file.name)
} 
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}