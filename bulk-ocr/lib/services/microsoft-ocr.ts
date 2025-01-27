import type { OCRSettings } from "../types/settings"

export async function processWithMicrosoft(imageData: string, settings: OCRSettings) {
  if (!settings.apiKeys.microsoft) {
    throw new Error("Microsoft API key not configured")
  }

  try {
    const endpoint = "https://api.cognitive.microsoft.com/vision/v3.2/ocr"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.apiKeys.microsoft,
      },
      body: JSON.stringify({
        url: imageData,
      }),
    })

    if (!response.ok) {
      throw new Error("Microsoft OCR API request failed")
    }

    const result = await response.json()

    // Process the result and extract text
    const text = processOCRResult(result)

    // Check confidence threshold
    if (getAverageConfidence(result) < settings.confidence) {
      return {
        success: false,
        error: "Text recognition confidence below threshold",
      }
    }

    return { success: true, text }
  } catch (error) {
    console.error("Microsoft OCR error:", error)
    return { success: false, error: "Failed to process with Microsoft OCR" }
  }
}

function processOCRResult(result: any): string {
  // Process the Microsoft OCR response format
  let text = ""

  if (result.regions) {
    for (const region of result.regions) {
      for (const line of region.lines) {
        for (const word of line.words) {
          text += word.text + " "
        }
        text += "\n"
      }
      text += "\n"
    }
  }

  return text.trim()
}

function getAverageConfidence(result: any): number {
  let total = 0
  let count = 0

  if (result.regions) {
    for (const region of result.regions) {
      for (const line of region.lines) {
        for (const word of line.words) {
          total += word.confidence
          count++
        }
      }
    }
  }

  return count > 0 ? total / count : 0
}

