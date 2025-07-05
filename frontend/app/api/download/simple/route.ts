import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Try absolute path first
    const filePath = 'C:\\copy-quackquery\\Vision-Cheat\\out\\make\\squirrel.windows\\x64\\QuackQuerySetup.exe';
    
    console.log('Checking file at:', filePath);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found',
        path: filePath
      }, { status: 404 });
    }
    
    console.log('File exists, reading...');
    
    // Read the entire file
    const fileBuffer = await readFile(filePath);
    
    console.log(`File read successfully: ${Math.round(fileBuffer.length / 1024 / 1024)}MB`);
    
    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="QuackQuerySetup.exe"',
        'Content-Length': fileBuffer.length.toString(),
      }
    });
    
  } catch (error) {
    console.error('Simple download error:', error);
    return NextResponse.json({ 
      error: 'Download failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 