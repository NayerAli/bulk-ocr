import type { AppSettings } from "../types"

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  severity: "error" | "warning"
}

export class ValidationService {
  static validateConfiguration(settings: AppSettings): ValidationResult {
    const errors: ValidationError[] = []

    // Check OCR provider configuration
    const { provider, apiKeys } = settings.ocr
    if (!provider) {
      errors.push({
        code: "OCR_PROVIDER_MISSING",
        message: "Please select an OCR provider (Claude or OpenAI)",
        field: "ocr.provider",
        severity: "error",
      })
    }

    // Check API keys
    const apiKey = apiKeys[provider]
    if (!apiKey) {
      errors.push({
        code: "API_KEY_MISSING",
        message: `Please configure an API key for ${provider}`,
        field: "ocr.apiKeys",
        severity: "error",
      })
    } else if (!apiKey.startsWith("sk-")) {
      errors.push({
        code: "API_KEY_INVALID",
        message: `Invalid API key format for ${provider}`,
        field: "ocr.apiKeys",
        severity: "error",
      })
    }

    // Check processing settings
    if (settings.processing.maxConcurrentJobs < 1) {
      errors.push({
        code: "INVALID_CONCURRENT_JOBS",
        message: "Maximum concurrent jobs must be at least 1",
        field: "processing.maxConcurrentJobs",
        severity: "error",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateFile(file: File, settings: AppSettings): ValidationResult {
    const errors: ValidationError[] = []

    // Check file size
    if (file.size > settings.upload.maxFileSize) {
      errors.push({
        code: "FILE_TOO_LARGE",
        message: `File size exceeds maximum allowed size of ${settings.upload.maxFileSize / (1024 * 1024)}MB`,
        severity: "error",
      })
    }

    // Check file type
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
    if (!settings.upload.allowedFileTypes.includes(fileExtension)) {
      errors.push({
        code: "INVALID_FILE_TYPE",
        message: `File type ${fileExtension} is not supported. Allowed types: ${settings.upload.allowedFileTypes.join(", ")}`,
        severity: "error",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
} 