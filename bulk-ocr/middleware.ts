import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/services/db';

export async function middleware(request: NextRequest) {
  // Only handle file routes
  if (!request.nextUrl.pathname.startsWith('/uploads/') && 
      !request.nextUrl.pathname.startsWith('/thumbnails/')) {
    return NextResponse.next();
  }

  try {
    // Get file ID from path
    const fileName = request.nextUrl.pathname.split('/').pop();
    if (!fileName) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    const fileId = fileName.split('.')[0].split('_')[0]; // Remove extension and _thumb suffix

    // Check if file exists in database
    const db = await getDb();
    const file = await db.getFile(fileId);
    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Validate file access (add your own access control logic here)
    // For example, check user session, permissions, etc.
    
    // Allow access
    return NextResponse.next();
  } catch (error) {
    console.error('Error in file middleware:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const config = {
  matcher: ['/uploads/:path*', '/thumbnails/:path*']
}; 
