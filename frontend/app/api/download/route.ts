import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, sudoUsers, user } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    console.log('Download API called for paying users');
    
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

    // Log user type
    if (isSudo || isAdmin) {
      console.log('User is sudo/admin - they should use /api/download/github directly');
    } else {
      console.log('User is paying customer - proceeding with GitHub download');
    }

    // For paying users, stream the file from GitHub (same as sudo users)
    console.log('Streaming file for paying user from GitHub');

    // GitHub repository info - same as sudo endpoint
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kushagra2503';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Vision_Cheat';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      console.log('No GitHub token configured');
      return NextResponse.json({ error: 'GitHub access not configured' }, { status: 500 });
    }

    // Windows executable name
    const assetName = 'QuackQuerySetup.exe';
    console.log('Looking for asset:', assetName);

    try {
      // Get latest release info from GitHub API
      const githubUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      console.log('Making GitHub API request to:', githubUrl);
      
      const releaseResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'QuackQuery-App'
        }
      });

      console.log('GitHub API response status:', releaseResponse.status);

      if (!releaseResponse.ok) {
        const errorText = await releaseResponse.text();
        console.error('GitHub API error:', errorText);
        throw new Error(`GitHub API error: ${releaseResponse.status} - ${errorText}`);
      }

      const release = await releaseResponse.json();
      console.log('Release found:', { 
        tag: release.tag_name, 
        assetsCount: release.assets?.length || 0,
        assetNames: release.assets?.map((a: any) => a.name) || []
      });
      
      // Find the Windows executable asset
      const asset = release.assets.find((asset: any) => asset.name === assetName);
      
      if (!asset) {
        console.log('Windows executable not found. Available assets:', release.assets.map((a: any) => a.name));
        return NextResponse.json({ 
          error: `Windows executable not found. Available assets: ${release.assets.map((a: any) => a.name).join(', ')}` 
        }, { status: 404 });
      }

      console.log('Asset found:', { name: asset.name, url: asset.url });

      // Download the file from GitHub with authentication and stream it to the client
      const fileResponse = await fetch(asset.url, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/octet-stream',
          'User-Agent': 'QuackQuery-App'
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }

      console.log('File downloaded successfully, streaming to client');

      // Log the download
      console.log(`Download: ${userEmail} (PAYING USER) downloaded Windows version from GitHub`);

      return new NextResponse(fileResponse.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${assetName}"`,
          'Content-Length': fileResponse.headers.get('Content-Length') || '',
        }
      });

    } catch (githubError) {
      console.error('GitHub download error:', githubError);
      return NextResponse.json({ 
        error: 'Failed to fetch release from GitHub',
        details: githubError instanceof Error ? githubError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 