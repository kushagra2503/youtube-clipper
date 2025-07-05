import { NextResponse } from "next/server";
import db from "@/lib/db";
import { payment, user, sudoUsers } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: { email: string } }) {
  try {
    const email = decodeURIComponent(params.email);
    console.log('Checking payment for email:', email);

    // Find user by email
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({
        found: false,
        error: "User not found",
        email: email
      });
    }

    const userId = userRecord[0].id;

    // Check payment records
    const paymentRecords = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId));

    // Check if sudo user
    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .limit(1);

    const isSudo = sudoUser.length > 0;
    const isAdmin = userRecord[0].isAdmin;

    // Check if user has active payment
    const activePayments = paymentRecords.filter(p => p.status === "active");
    const lifetimeAccess = activePayments.length > 0;
    const canDownload = lifetimeAccess || isSudo || isAdmin;

    return NextResponse.json({
      found: true,
      email: email,
      userId: userId,
      userRecord: userRecord[0],
      paymentRecords: paymentRecords,
      paymentCount: paymentRecords.length,
      activePayments: activePayments,
      activePaymentCount: activePayments.length,
      isSudo: isSudo,
      isAdmin: isAdmin,
      lifetimeAccess: lifetimeAccess,
      canDownload: canDownload,
      debug: {
        allStatuses: paymentRecords.map(p => p.status),
        hasActivePayment: activePayments.length > 0,
        calculation: {
          lifetimeAccess,
          isSudo,
          isAdmin,
          result: canDownload
        }
      }
    });

  } catch (error) {
    console.error('Debug payment check error:', error);
    return NextResponse.json({
      error: "Database error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 