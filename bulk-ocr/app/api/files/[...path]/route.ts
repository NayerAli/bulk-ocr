import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { FileService } from '@/lib/services/file-service';
import { getDb } from '@/lib/services/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');
    const isThumb = filePath.startsWith('thumbnails/');
    
    // Get file service instance and database
    const fileService = FileService.getInstance();
    const db = await getDb();
    
    // Get file ID from path
    const fileName = path.basename(filePath);
    const fileId = fileName.split('.')[0].split('_')[0]; // Remove extension and _thumb suffix

    // Check if file exists in database
    const file = await db.getFile(fileId);
    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Determine actual file path
    const fullPath = isThumb
      ? path.join(process.cwd(), 'data', 'thumbnails', fileName)
      : path.join(process.cwd(), 'data', 'uploads', fileName);

    // Check if file exists on disk
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Get file stats and type
    const { size, type } = await fileService.getFileStats(fullPath);

    // Stream the file
    const stream = fs.createReadStream(fullPath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': type,
        'Content-Length': size.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
