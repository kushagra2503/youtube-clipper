import { NextResponse } from "next/server";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Get recent payments (last 10)
    const recentPayments = await db
      .select()
      .from(payment)
      .orderBy(sql`${payment.createdAt} DESC`)
      .limit(10);

    // Get recent users (last 10)
    const recentUsers = await db
      .select()
      .from(user)
      .orderBy(sql`${user.createdAt} DESC`)
      .limit(10);

    return NextResponse.json({
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        userId: p.userId,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt
      })),
      summary: {
        totalPayments: recentPayments.length,
        activePayments: recentPayments.filter(p => p.status === 'active').length,
        totalUsers: recentUsers.length,
        lastPaymentTime: recentPayments[0]?.createdAt,
        lastUserTime: recentUsers[0]?.createdAt
      }
    });

  } catch (error) {
    console.error('Recent payments debug error:', error);
    return NextResponse.json({
      error: "Database error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 