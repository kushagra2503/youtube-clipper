import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    console.log('GitHub download API called');
    
    const incomingHeaders = await headers();
    const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

    if (!session || !session.user) {
      console.log('No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    console.log('User email:', userEmail);

    // Check if user is a sudo user
    let isSudo = false;
    if (userEmail) {
      try {
        const sudoUser = await db
          .select()
          .from(sudoUsers)
          .where(eq(sudoUsers.email, userEmail.toLowerCase()))
          .limit(1);

        console.log('Sudo user query result:', sudoUser);
        
        if (sudoUser.length > 0) {
          isSudo = true;
          console.log('User is confirmed sudo');
        } else {
          console.log('User is NOT sudo');
        }
      } catch (dbError) {
        console.error('Database error checking sudo status:', dbError);
        return NextResponse.json({ error: "Database error", details: dbError.message }, { status: 500 });
      }
    }

    if (!isSudo) {
      console.log('Returning sudo access required error');
      return NextResponse.json({ error: "Sudo access required" }, { status: 403 });
    }

    // Only supporting Windows for now
    console.log('Platform: Windows (only supported platform)');

    // GitHub repository info - UPDATE THESE VALUES
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kushagra2503';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Vision_Cheat';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token

    console.log('GitHub config:', { 
      owner: GITHUB_OWNER, 
      repo: GITHUB_REPO, 
      hasToken: !!GITHUB_TOKEN 
    });

    if (!GITHUB_TOKEN) {
      console.log('No GitHub token configured');
      return NextResponse.json({ error: 'GitHub access not configured' }, { status: 500 });
    }

    // Windows executable name - UPDATE THIS TO MATCH YOUR RELEASE FILE
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
      console.log(`GitHub Download: ${userEmail} (SUDO) downloaded Windows version from private GitHub repo`);

      return new NextResponse(fileResponse.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${assetName}"`,
          'Content-Length': fileResponse.headers.get('Content-Length') || '',
        }
      });

    } catch (error) {
      console.error('GitHub download error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch release from GitHub',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (globalError) {
    console.error('Global error in GitHub download API:', globalError);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: globalError instanceof Error ? globalError.message : 'Unknown error'
    }, { status: 500 });
  }
} 