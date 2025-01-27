import { NextResponse } from "next/server"
import { OCRService } from "@/lib/services/ocr-service"

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = await request.json()

    const settings = {
      provider,
      apiKeys: {
        [provider]: apiKey,
      },
      language: "arabic",
      confidence: 0.8,
      retryAttempts: 3,
      retryDelay: 1000,
    }

    const ocrService = new OCRService(settings)
    await ocrService.validateConfiguration()

    return NextResponse.json({ success: true, message: "API key is valid" })
  } catch (error) {
    console.error("Test OCR error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to validate API key",
      },
      { status: 400 },
    )
  }
}

