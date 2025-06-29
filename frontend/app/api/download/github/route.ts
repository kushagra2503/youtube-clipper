import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const incomingHeaders = await headers();
  const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;

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

  if (!isSudo) {
    return NextResponse.json({ error: "Sudo access required" }, { status: 403 });
  }

  // Get platform from query params
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform') || 'windows';

  // 🔥 UPDATE THESE WITH YOUR ACTUAL GITHUB REPOSITORY URLs
  // Replace 'yourusername/quackquery' with your actual GitHub repo
  const githubReleaseUrls = {
    windows: 'https://github.com/yourusername/quackquery/releases/latest/download/QuackQuery-Setup.exe',
    mac: 'https://github.com/yourusername/quackquery/releases/latest/download/QuackQuery.dmg',
    linux: 'https://github.com/yourusername/quackquery/releases/latest/download/QuackQuery.AppImage'
  };

  const downloadUrl = githubReleaseUrls[platform as keyof typeof githubReleaseUrls];
  if (!downloadUrl) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // Log the download
  console.log(`GitHub Download: ${userEmail} (SUDO) requested ${platform} version from GitHub`);

  return NextResponse.json({ 
    downloadUrl,
    platform,
    version: 'latest',
    source: 'github',
    directDownload: true
  });
} 