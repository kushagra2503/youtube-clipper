import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // GitHub repository info
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kushagra2503';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'Vision_Cheat';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub access not configured' }, { status: 500 });
    }

    console.log('Direct download - GitHub config:', { 
      owner: GITHUB_OWNER, 
      repo: GITHUB_REPO, 
      hasToken: !!GITHUB_TOKEN 
    });

    const assetName = 'QuackQuerySetup.exe';

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
      console.log('✅ DIRECT DOWNLOAD: File served successfully');

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
    console.error('Direct download error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 