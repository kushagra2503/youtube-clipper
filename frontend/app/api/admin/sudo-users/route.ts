import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { checkIsAdmin } from "@/lib/admin";

// GET: List all sudo users
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(req.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }
    
    const users = await db.select().from(sudoUsers);
    
    return NextResponse.json({ sudoUsers: users });
  } catch (error) {
    console.error("Error fetching sudo users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new sudo user
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(new Headers(req.headers));
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }
    
    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check if email already exists
    const existingSudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingSudoUser.length > 0) {
      return NextResponse.json({ error: "Email is already a sudo user" }, { status: 409 });
    }

    // Add new sudo user
    const newSudoUser = await db.insert(sudoUsers).values({
      id: uuidv4(),
      email: email.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({ 
      message: "Sudo user added successfully", 
      sudoUser: newSudoUser[0] 
    });
  } catch (error) {
    console.error("Error adding sudo user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a sudo user
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(new Headers(req.headers));
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const deletedSudoUser = await db
      .delete(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .returning();

    if (deletedSudoUser.length === 0) {
      return NextResponse.json({ error: "Sudo user not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Sudo user removed successfully",
      sudoUser: deletedSudoUser[0]
    });
  } catch (error) {
    console.error("Error removing sudo user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 