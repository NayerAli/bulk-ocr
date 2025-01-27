import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import type { OCRSettings } from "../types"
import { ProcessingError } from "../types"
import { delay, handleError } from "../utils"

interface GenerateTextOptions {
  model: any
  prompt: string
  system?: string
  maxTokens?: number
  data?: {
    images: string[]
  }
}

interface OCRResult {
  success: boolean
  text?: string
  error?: string
}

export class OCRService {
  private settings: OCRSettings
  private anthropicClient: any
  private openaiClient: any

  constructor(settings: OCRSettings) {
    this.settings = settings

    try {
      if (typeof window === "undefined") {
        // Only initialize on server-side
        if (settings.apiKeys.claude) {
          process.env.ANTHROPIC_API_KEY = settings.apiKeys.claude
          this.anthropicClient = anthropic("claude-3-sonnet-20240229")
        }

        if (settings.apiKeys.openai) {
          process.env.OPENAI_API_KEY = settings.apiKeys.openai
          this.openaiClient = openai("gpt-4-vision-preview")
        }
      }
    } catch (error) {
      throw new ProcessingError("Failed to initialize OCR service", handleError(error))
    }
  }

  async validateConfiguration(): Promise<void> {
    const { provider, apiKeys } = this.settings

    if (!apiKeys[provider]) {
      throw new ProcessingError(`No API key configured for ${provider}`, { provider })
    }

    try {
      switch (provider) {
        case "claude":
          if (!this.anthropicClient) {
            throw new ProcessingError("Claude API client not initialized")
          }
          if (!apiKeys.claude?.startsWith("sk-")) {
            throw new ProcessingError("Invalid Claude API key format")
          }
          break
        case "openai":
          if (!this.openaiClient) {
            throw new ProcessingError("OpenAI API client not initialized")
          }
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

      const prompt = `Extract text from this ${this.settings.language} document. 
                     Maintain all formatting, line breaks, and paragraph structures.
                     Only return the extracted text, no explanations or metadata.`

      const model = this.settings.provider === "claude" ? this.anthropicClient : this.openaiClient

      if (!model) {
        throw new ProcessingError(`${this.settings.provider} model not initialized`)
      }

      console.log(`Processing with ${this.settings.provider}, attempt ${retryCount + 1}/${this.settings.retryAttempts}`)

      const result = await generateText({
        model,
        prompt,
        system: "You are a specialized OCR system for extracting text from images and PDFs, with particular expertise in Arabic and Persian scripts.",
        maxTokens: 4096,
        data: { images: [imageData] },
      } as GenerateTextOptions)

      if (!result?.text) {
        throw new ProcessingError("No text generated from OCR service")
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

