import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, sudoUsers, user } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";

// Force Node.js runtime for file system access
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    console.log('Local download API called');
    
    const incomingHeaders = await headers();
    const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

    if (!session || !session.user) {
      console.log('No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    console.log('User:', userId, userEmail);

    // Check if user is a sudo user
    let isSudo = false;
    if (userEmail) {
      const sudoUser = await db
        .select()
        .from(sudoUsers)
        .where(eq(sudoUsers.email, userEmail.toLowerCase()))
        .limit(1);

      if (sudoUser.length > 0) {
        isSudo = true;
      }
    }

    // Check if user is an admin
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const isAdmin = dbUser.length > 0 && dbUser[0].isAdmin;

    // Check if user has active payment (lifetime access)
    let lifetimeAccess = false;
    const userPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId))
      .orderBy(sql`${payment.createdAt} DESC`)
      .limit(1);

    if (userPayment.length > 0 && userPayment[0].status === "active") {
      lifetimeAccess = true;
    }

    // Check if user can download
    const canDownload = lifetimeAccess || isSudo || isAdmin;

    if (!canDownload) {
      console.log('User cannot download - no payment or privileges');
      return NextResponse.json({ 
        error: "Premium purchase required for downloads",
        requiresPayment: true,
        redirectTo: "/pricing"
      }, { status: 403 });
    }

    // Path to the built executable (using the working path from test)
    const executablePath = 'C:\\copy-quackquery\\Vision-Cheat\\out\\make\\squirrel.windows\\x64\\QuackQuerySetup.exe';
    console.log('Looking for executable at:', executablePath);

    if (!existsSync(executablePath)) {
      console.error('Executable not found at:', executablePath);
      return NextResponse.json({ 
        error: 'Setup file not found. Please contact support.',
        details: `QuackQuerySetup.exe not found at: ${executablePath}`
      }, { status: 404 });
    }

    return serveFile(executablePath, userEmail);
  } catch (error) {
    console.error('Local download API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function serveFile(filePath: string, userEmail: string | null | undefined) {
  try {
    // Get file stats
    const stats = statSync(filePath);
    const fileSize = stats.size;
    
    console.log(`Serving local file: ${filePath} (${Math.round(fileSize / 1024 / 1024)}MB)`);

    // Log the download
    console.log(`Download: ${userEmail} downloaded Windows version locally`);

    // Create a readable stream from the file
    const stream = createReadStream(filePath);
    
    // Convert Node.js stream to Web Stream
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        stream.on('end', () => {
          controller.close();
        });
        
        stream.on('error', (error) => {
          controller.error(error);
        });
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="QuackQuerySetup.exe"',
        'Content-Length': fileSize.toString(),
      }
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ 
      error: 'File serving error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 