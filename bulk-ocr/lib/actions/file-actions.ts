'use server'

import fs from 'fs'
import type { CachedFile } from '../services/database-types'

export async function readFileFromDisk(filePath: string): Promise<{ data: string; type: string }> {
  try {
    const buffer = await fs.promises.readFile(filePath)
    
    // Determine MIME type from file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    let type = 'application/octet-stream'
    
    switch (ext) {
      case 'pdf':
        type = 'application/pdf'
        break
      case 'jpg':
      case 'jpeg':
        type = 'image/jpeg'
        break
      case 'png':
        type = 'image/png'
        break
      case 'tiff':
      case 'tif':
        type = 'image/tiff'
        break
      case 'bmp':
        type = 'image/bmp'
        break
    }
    
    // Convert buffer to base64
    const base64Data = buffer.toString('base64')
    
    return {
      data: `data:${type};base64,${base64Data}`,
      type
    }
  } catch (error) {
    console.error('Error reading file:', error)
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 
