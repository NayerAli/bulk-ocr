import type { OCRSettings } from "../types"
import { ProcessingError } from "../types"
import { delay, handleError } from "../utils"
import { processWithClaude } from "./claude-ocr"
import { processWithOpenAI } from "./openai-ocr"

interface OCRResult {
  success: boolean
  text?: string
  error?: string
}

export class OCRService {
  private settings: OCRSettings

  constructor(settings: OCRSettings) {
    this.settings = settings
  }

  async validateConfiguration(): Promise<void> {
    const { provider, apiKeys } = this.settings

    if (!apiKeys[provider]) {
      throw new ProcessingError(`No API key configured for ${provider}`, { provider })
    }

    if (!this.settings.model) {
      throw new ProcessingError("No model selected")
    }

    try {
      // Validate API key format
      switch (provider) {
        case "claude":
          if (!apiKeys.claude?.startsWith("sk-")) {
            throw new ProcessingError("Invalid Claude API key format")
          }
          break
        case "openai":
          if (!apiKeys.openai?.startsWith("sk-")) {
            throw new ProcessingError("Invalid OpenAI API key format")
          }
          break
        default:
          throw new ProcessingError(`Unsupported provider: ${provider}`)
      }
    } catch (error) {
      if (error instanceof ProcessingError) {
        throw error
      }
      throw new ProcessingError("Configuration validation failed", handleError(error))
    }
  }

  async processImage(imageData: string, retryCount = 0): Promise<OCRResult> {
    try {
      await this.validateConfiguration()

      if (!imageData) {
        throw new ProcessingError("No image data provided")
      }

      console.log(`Processing with ${this.settings.provider}, attempt ${retryCount + 1}/${this.settings.retryAttempts}`)

      const result = this.settings.provider === "claude"
        ? await processWithClaude(imageData, this.settings)
        : await processWithOpenAI(imageData, this.settings)

      if (!result.success || !result.text) {
        throw new ProcessingError(result.error || "No text generated from OCR service")
      }

      return { success: true, text: result.text }
    } catch (error) {
      const processedError = handleError(error)
      console.error("OCR Processing error:", {
        error: processedError,
        provider: this.settings.provider,
        retryCount,
      })

      if (retryCount < this.settings.retryAttempts) {
        await delay(this.settings.retryDelay)
        return this.processImage(imageData, retryCount + 1)
      }

      return {
        success: false,
        error: `OCR processing failed after ${retryCount} retries: ${processedError.message}`,
      }
    }
  }
}

