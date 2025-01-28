import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getDb } from '@/lib/services/db';
import { FileService } from '@/lib/services/file-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const [jobId, pageNumber] = params.path;
    
    if (!jobId || !pageNumber) {
      return new NextResponse('Invalid parameters', { status: 400 });
    }

    // Get the page result from database
    const db = await getDb();
    const pageResult = await db.getPageResult(jobId, parseInt(pageNumber));
    
    if (!pageResult || !pageResult.imagePath) {
      return new NextResponse('Page not found', { status: 404 });
    }

    // Get file service instance
    const fileService = FileService.getInstance();
    
    // Get the full file path
    const filePath = path.join(process.cwd(), pageResult.imagePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Get file stats and type
    const { size, type } = await fileService.getFileStats(filePath);

    // Stream the file
    const stream = fs.createReadStream(filePath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': type,
        'Content-Length': size.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    console.error('Error serving preview:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 