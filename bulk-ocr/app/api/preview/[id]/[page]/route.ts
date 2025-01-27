import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/services/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; page: string } }
) {
  try {
    const { id, page } = params
    const pageNumber = parseInt(page, 10)

    // Get the file from the database
    const file = await db.getFile(id)
    if (!file) {
      return new NextResponse("File not found", { status: 404 })
    }

    // Return the file data with appropriate headers
    return new NextResponse(file.data, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("Error serving preview:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 