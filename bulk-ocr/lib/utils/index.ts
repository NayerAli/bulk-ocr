import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge class names with Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Handle and format error messages consistently
 */
export function handleError(error: unknown): { message: string; details?: Record<string, any> } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: "details" in error ? (error as any).details : undefined,
    }
  }

  if (typeof error === "string") {
    return { message: error }
  }

  return { message: "An unknown error occurred", details: { error } }
}

/**
 * Generate a unique ID for jobs and documents
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0
  const progress = (current / total) * 100
  return Math.min(100, Math.max(0, progress))
}

/**
 * Get file type from file name
 */
export function getFileType(fileName: string): "pdf" | "image" {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension === "pdf" ? "pdf" : "image"
}

/**
 * Check if file type is valid
 */
export function isValidFileType(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return ["pdf", "jpg", "jpeg", "png"].includes(extension || "")
}

/**
 * Format date with Intl.DateTimeFormat
 */
export function formatDate(date: Date, format = "PP"): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: format === "PP" ? "medium" : "short",
  }).format(date)
}

/**
 * Format time with Intl.DateTimeFormat
 */
export function formatTime(date: Date, format = "pp"): string {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: format === "pp" ? "medium" : "short",
  }).format(date)
}

