import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import type { OCRSettings } from "../types/settings"

export async function processWithClaude(imageData: string, settings: OCRSettings) {
  if (!settings.apiKeys.claude) {
    throw new Error("Claude API key not configured")
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-3-sonnet-20240229"),
      prompt: `Extract text from this image. 
              The text is primarily in ${settings.language}. 
              Maintain all formatting, line breaks, and paragraph structures.
              Only return the extracted text, no explanations or metadata.`,
      system:
        "You are a specialized OCR system for extracting text from images and PDFs, with particular expertise in Arabic and Persian scripts.",
    })

    return { success: true, text }
  } catch (error) {
    console.error("Claude OCR error:", error)
    return { success: false, error: "Failed to process with Claude" }
  }
}

