import { NextRequest, NextResponse } from "next/server"
import path from "path"
import db from "@/lib/services/db"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const pageNumber = searchParams.get('pageNumber')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    if (pageNumber) {
      const result = await db.getPageResult(jobId, parseInt(pageNumber))
      return NextResponse.json(result)
    } else {
      const results = await db.getPageResults(jobId)
      return NextResponse.json(results)
    }
  } catch (error) {
    console.error('Error fetching page results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page results' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.jobId || !data.pageNumber || !data.text) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, pageNumber, text' },
        { status: 400 }
      )
    }

    // Get the job
    const job = await db.getJob(data.jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get the file path
    const imagePath = path.join('data', 'uploads', job.fileName)

    // Create page result with image path
    const pageResult = {
      ...data,
      imagePath,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      metadata: data.metadata ? {
        ...data.metadata,
        timestamp: data.metadata.timestamp ? new Date(data.metadata.timestamp) : new Date()
      } : undefined
    }

    await db.savePageResult(pageResult)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving page result:', error)
    return NextResponse.json(
      { error: 'Failed to save page result' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    await db.deletePageResults(jobId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting page results:', error)
    return NextResponse.json(
      { error: 'Failed to delete page results' },
      { status: 500 }
    )
  }
} 
