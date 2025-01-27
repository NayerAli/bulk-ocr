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

export function getFileType(fileName: string): FileType {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension === "pdf" ? "pdf" : "image"
}

export function isValidFileType(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return ["pdf", "jpg", "jpeg", "png"].includes(extension || "")
}

