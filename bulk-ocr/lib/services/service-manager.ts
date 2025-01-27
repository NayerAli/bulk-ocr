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
    this.ocrService = new OCRService(settings)
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