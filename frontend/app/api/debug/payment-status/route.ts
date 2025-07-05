import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const incomingHeaders = await headers();
  const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    // Get all payment records for this user
    const paymentRecords = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId));

    // Get user record
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Also check if there's a payment for this email (fallback check)
    let paymentByEmail = [];
    if (userEmail) {
      const userByEmail = await db
        .select()
        .from(user)
        .where(eq(user.email, userEmail));

      if (userByEmail.length > 0) {
        paymentByEmail = await db
          .select()
          .from(payment)
          .where(eq(payment.userId, userByEmail[0].id));
      }
    }

    return NextResponse.json({
      userId,
      userEmail,
      paymentRecords,
      paymentCount: paymentRecords.length,
      userRecord: userRecord[0] || null,
      paymentByEmail,
      debug: {
        hasActivePayment: paymentRecords.some(p => p.status === "active"),
        activePayments: paymentRecords.filter(p => p.status === "active"),
        allStatuses: paymentRecords.map(p => p.status)
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: "Database error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 