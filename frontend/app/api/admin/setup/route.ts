import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET: Check if any admins exist and current user status
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if any admin exists in the system
    const existingAdmins = await db
      .select()
      .from(user)
      .where(eq(user.isAdmin, true))
      .limit(1);

    // Get current user's admin status
    const currentUser = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      hasAdmins: existingAdmins.length > 0,
      currentUserIsAdmin: currentUser.length > 0 && currentUser[0].isAdmin,
      currentUserEmail: session.user.email,
      canMakeFirstAdmin: existingAdmins.length === 0
    });
  } catch (error) {
    console.error("Error checking admin setup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Make current user the first admin (only if no admins exist)
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if any admin already exists
    const existingAdmins = await db
      .select()
      .from(user)
      .where(eq(user.isAdmin, true))
      .limit(1);

    if (existingAdmins.length > 0) {
      return NextResponse.json({ 
        error: "Admin already exists. Only one admin can be set up this way." 
      }, { status: 409 });
    }

    // Make current user an admin
    const updatedUser = await db
      .update(user)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(eq(user.id, session.user.id))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Successfully set up as admin!", 
      user: updatedUser[0] 
    });
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 