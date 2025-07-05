import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

// Force Node.js runtime for file system access
export const runtime = 'nodejs';

export async function GET() {
  try {
    const cwd = process.cwd();
    
    const paths = [
      join(cwd, '../Vision-Cheat/out/make/squirrel.windows/x64/QuackQuerySetup.exe'),
      join(cwd, '../../Vision-Cheat/out/make/squirrel.windows/x64/QuackQuerySetup.exe'),
      'C:\\copy-quackquery\\Vision-Cheat\\out\\make\\squirrel.windows\\x64\\QuackQuerySetup.exe',
      join(cwd, '../../../Vision-Cheat/out/make/squirrel.windows/x64/QuackQuerySetup.exe'),
    ];
    
    const results = paths.map(path => ({
      path,
      exists: existsSync(path)
    }));
    
    return NextResponse.json({
      cwd,
      paths: results,
      workingDir: process.cwd(),
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 