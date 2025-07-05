import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { sudoUsers, user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { checkIsAdmin } from "@/lib/admin";
import { headers } from "next/headers";

// GET: List all sudo users
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(request.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    const allSudoUsers = await db
      .select()
      .from(sudoUsers)
      .orderBy(sudoUsers.createdAt);

    return NextResponse.json({
      success: true,
      sudoUsers: allSudoUsers
    });

  } catch (error) {
    console.error('❌ SUDO USERS GET ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sudo users'
    }, { status: 500 });
  }
}

// POST: Add a new sudo user
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(request.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    // Check if already a sudo user
    const existingSudo = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingSudo.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'User is already a sudo user'
      }, { status: 409 });
    }

    // Add as sudo user
    const newSudoUser = await db
      .insert(sudoUsers)
      .values({
        id: uuidv4(),
        email: email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log(`✅ SUDO USER ADDED: ${email} by admin ${adminCheck.user?.email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${email} as sudo user`,
      sudoUser: newSudoUser[0]
    });

  } catch (error) {
    console.error('❌ SUDO USER ADD ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add sudo user'
    }, { status: 500 });
  }
}

// DELETE: Remove a sudo user
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(request.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    // Remove sudo user
    const deleted = await db
      .delete(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Sudo user not found'
      }, { status: 404 });
    }

    console.log(`🗑️ SUDO USER REMOVED: ${email} by admin ${adminCheck.user?.email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${email} from sudo users`
    });

  } catch (error) {
    console.error('❌ SUDO USER REMOVE ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove sudo user'
    }, { status: 500 });
  }
} 