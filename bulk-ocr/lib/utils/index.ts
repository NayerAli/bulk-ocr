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

export function getFileType(fileName: string): "pdf" | "image" {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension === "pdf" ? "pdf" : "image"
}

export function isValidFileType(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return ["pdf", "jpg", "jpeg", "png"].includes(extension || "")
}

export function formatDate(date: Date, format = "PP"): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: format === "PP" ? "medium" : "short",
  }).format(date)
}

export function formatTime(date: Date, format = "pp"): string {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: format === "pp" ? "medium" : "short",
  }).format(date)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function handleError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(typeof error === "string" ? error : "Unknown error occurred")
}

