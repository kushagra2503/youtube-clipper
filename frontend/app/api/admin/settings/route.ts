import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";

// For now, we'll store settings in memory
// In production, you'd want to store these in the database
let adminSettings = {
  maintenance: false,
  downloadEnabled: true,
  maxFreeDownloads: 3,
  announcements: ['System running on real database!']
};

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(req.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    return NextResponse.json(adminSettings);
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(req.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    const updates = await req.json();
    
    // Update settings with provided values
    if (typeof updates.maintenance === 'boolean') {
      adminSettings.maintenance = updates.maintenance;
    }
    if (typeof updates.downloadEnabled === 'boolean') {
      adminSettings.downloadEnabled = updates.downloadEnabled;
    }
    if (typeof updates.maxFreeDownloads === 'number') {
      adminSettings.maxFreeDownloads = updates.maxFreeDownloads;
    }
    if (Array.isArray(updates.announcements)) {
      adminSettings.announcements = updates.announcements;
    }

    return NextResponse.json({ 
      message: "Settings updated successfully",
      settings: adminSettings 
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 