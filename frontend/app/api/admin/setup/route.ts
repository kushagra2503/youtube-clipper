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
export async function POST(request: NextRequest) {
  try {
    const adminEmail = "radhikayash2@gmail.com";
    
    console.log(`🔧 ADMIN SETUP: Making ${adminEmail} an admin user...`);
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({
        success: false,
        message: `User ${adminEmail} not found. Please sign up first, then run this endpoint.`
      }, { status: 404 });
    }

    // Update user to be admin
    await db
      .update(user)
      .set({
        isAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(user.email, adminEmail));

    console.log(`✅ ADMIN SETUP: ${adminEmail} is now an admin user!`);

    return NextResponse.json({
      success: true,
      message: `Successfully made ${adminEmail} an admin user`,
      user: {
        id: existingUser[0].id,
        email: existingUser[0].email,
        isAdmin: true
      }
    });

  } catch (error) {
    console.error('❌ ADMIN SETUP ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set up admin user'
    }, { status: 500 });
  }
} 