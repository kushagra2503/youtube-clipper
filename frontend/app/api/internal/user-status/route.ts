import { NextResponse } from "next/server";
import db from "@/lib/db";
import { payment, sudoUsers, user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user is admin
    const isAdmin = normalizedEmail === 'radhikayash2@gmail.com';

    // Check if user is a sudo user
    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, normalizedEmail))
      .limit(1);

    const isSudoUser = sudoUser.length > 0;

    if (isAdmin || isSudoUser) {
      return NextResponse.json({ 
        isPremium: true, 
        isSudoUser: isSudoUser,
        isAdmin: isAdmin
      });
    }

    // Check if user has active payment by joining user and payment tables
    const userPayments = await db
      .select({
        paymentStatus: payment.status
      })
      .from(payment)
      .innerJoin(user, eq(payment.userId, user.id))
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    const hasActivePayment = userPayments.length > 0 && userPayments[0].paymentStatus === "active";
    const isPremium = isAdmin || isSudoUser || hasActivePayment;

    return NextResponse.json({ 
      isPremium, 
      isSudoUser,
      isAdmin
    });

  } catch (error) {
    console.error("Error checking user status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 