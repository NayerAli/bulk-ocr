import type { OCRSettings } from "../types"
import { OCRService } from "./ocr-service"

class ServiceManager {
  private static instance: ServiceManager
  private ocrService: OCRService | null = null

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager()
    }
    return ServiceManager.instance
  }

  initializeOCRService(settings: OCRSettings): void {
    // Validate required settings
    if (!settings.provider) {
      throw new Error("OCR provider not configured")
    }
    if (!settings.apiKeys[settings.provider]) {
      throw new Error(`API key not configured for provider: ${settings.provider}`)
    }
    if (!settings.model) {
      throw new Error("OCR model not selected")
    }

    // Initialize service with validated settings
    this.ocrService = new OCRService(settings)

    // Test the service configuration
    this.ocrService.validateConfiguration().catch(error => {
      console.error("Failed to validate OCR service configuration:", error)
      this.ocrService = null
      throw error
    })
  }

  getOCRService(): OCRService {
    if (!this.ocrService) {
      throw new Error("OCR service not initialized")
    }
    return this.ocrService
  }

  hasOCRService(): boolean {
    return this.ocrService !== null
  }
}

export const serviceManager = ServiceManager.getInstance() 