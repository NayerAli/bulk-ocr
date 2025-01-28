import { NextResponse } from "next/server"
import { ProcessingError } from "@/lib/types"
import { FileService } from "@/lib/services/file-service"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    // Log file details for debugging
    console.log("Upload request details:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    })

    // Use FileService to handle the upload
    const fileService = FileService.getInstance()
    
    try {
      const savedFile = await fileService.saveFile(file)
      console.log("File saved successfully:", {
        id: savedFile.id,
        path: savedFile.path,
        type: savedFile.type
      })

      // Get page count for PDFs
      let pageCount = 1
      if (savedFile.type === "application/pdf") {
        // In a real implementation, use pdf.js or similar to get page count
        pageCount = Math.floor(Math.random() * 20) + 1
      }

      return NextResponse.json({
        success: true,
        id: savedFile.id,
        totalPages: pageCount,
        filePath: savedFile.path,
        message: "File uploaded successfully",
      })
    } catch (saveError) {
      console.error("FileService save error:", {
        error: saveError,
        fileName: file.name,
        fileType: file.type
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: saveError instanceof Error ? saveError.message : "Failed to save file" 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Upload error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

