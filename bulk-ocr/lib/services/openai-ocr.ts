import type { OCRSettings } from "../types"
import { ProcessingError } from "../types"
import { handleError } from "../utils"

interface OCRResult {
  success: boolean
  text?: string
  error?: string
}

// Helper function to extract base64 data from data URL
function extractBase64FromDataUrl(dataUrl: string): { base64Data: string; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new ProcessingError('Invalid data URL format')
  }
  return {
    mimeType: matches[1],
    base64Data: matches[2]
  }
}

export async function processWithOpenAI(imageData: string, settings: OCRSettings): Promise<OCRResult> {
  try {
    if (typeof window !== "undefined") {
      throw new ProcessingError("OpenAI OCR can only be used server-side")
    }

    // Extract base64 data and mime type from data URL
    const { base64Data, mimeType } = extractBase64FromDataUrl(imageData)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.isTestMode ? 100 : 4096,
        messages: [
          {
            role: "system",
            content: "You are a specialized OCR system for extracting text from images and PDFs, with particular expertise in Arabic and Persian scripts."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract text from this ${settings.language} document. ${settings.isTestMode ? 'This is a test run - please only process a small sample of the text.' : 'Maintain all formatting, line breaks, and paragraph structures.'} Only return the extracted text, no explanations or metadata.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ProcessingError(error.error?.message || "OpenAI API request failed")
    }

    const result = await response.json()
    const text = result.choices?.[0]?.message?.content
    if (!text) {
      throw new ProcessingError("No text generated from OpenAI")
    }

    return { 
      success: true, 
      text: settings.isTestMode ? `[TEST MODE] ${text}` : text 
    }
  } catch (error) {
    const processedError = handleError(error)
    return {
      success: false,
      error: processedError.message
    }
  }
} 
