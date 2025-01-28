import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/services/db"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const jobs = await db.getJobs()
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const job = await request.json()
    
    // Convert date strings to Date objects
    const processedJob = {
      ...job,
      createdAt: new Date(job.createdAt),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      details: job.details.map((detail: any) => ({
        ...detail,
        timestamp: new Date(detail.timestamp)
      }))
    }

    const jobId = await db.saveJob(processedJob)
    const jobs = await db.getJobs()
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error saving job:', error)
    return NextResponse.json(
      { error: 'Failed to save job' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json()
    
    // Convert date fields in updates to Date objects
    const processedUpdates = {
      ...updates,
      createdAt: updates.createdAt ? new Date(updates.createdAt) : undefined,
      startedAt: updates.startedAt ? new Date(updates.startedAt) : undefined,
      completedAt: updates.completedAt ? new Date(updates.completedAt) : undefined,
      details: updates.details?.map((detail: any) => ({
        ...detail,
        timestamp: new Date(detail.timestamp)
      }))
    }

    await db.updateJob(id, processedUpdates)
    const jobs = await db.getJobs()
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    await db.deleteJob(id)
    const jobs = await db.getJobs()
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
} 
