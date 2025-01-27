import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import type { FileType } from "./types"

export async function processPageWithOCR(
  imageData: string,
  fileType: FileType,
  language: "arabic" | "persian" = "arabic",
) {
  try {
    const { text } = await generateText({
      model: anthropic("claude-3-sonnet-20240229"),
      prompt: `Extract text from this ${fileType === "pdf" ? "PDF page" : "image"}. 
              The text is primarily in ${language}. 
              Maintain all formatting, line breaks, and paragraph structures.
              Only return the extracted text, no explanations or metadata.`,
      system:
        "You are a specialized OCR system for extracting text from images and PDFs, with particular expertise in Arabic and Persian scripts.",
    })

    return { success: true, text }
  } catch (error) {
    console.error("OCR Processing error:", error)
    return { success: false, error: "Failed to process image" }
  }
}

