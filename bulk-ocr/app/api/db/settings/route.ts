import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/services/db"
import { DEFAULT_SETTINGS } from "@/lib/stores/store"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const settings = await db.getSettings()
    return NextResponse.json(settings || DEFAULT_SETTINGS)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json()
    await db.saveSettings(settings)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
} 