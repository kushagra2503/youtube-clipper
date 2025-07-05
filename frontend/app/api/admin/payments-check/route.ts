import { NextRequest, NextResponse } from 'next/server';
import db from "@/lib/db";
import { user, payment } from "@/lib/schema";
import { eq, count, sql } from "drizzle-orm";
import { checkIsAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(request.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    console.log('🔍 PAYMENT CHECK: Analyzing DodoPayments data...');

    // Get all payments with details
    const allPayments = await db
      .select({
        paymentId: payment.id,
        userId: payment.userId,
        status: payment.status,
        createdAt: payment.createdAt,
        userEmail: user.email,
        userName: user.name
      })
      .from(payment)
      .leftJoin(user, eq(payment.userId, user.id))
      .orderBy(sql`${payment.createdAt} DESC`);

    // Count payments by status
    const paymentStats = {
      total: allPayments.length,
      active: allPayments.filter(p => p.status === 'active').length,
      completed: allPayments.filter(p => p.status === 'completed').length,
      pending_signup: allPayments.filter(p => p.status === 'pending_signup').length,
      pending_user_match: allPayments.filter(p => p.status === 'pending_user_match').length,
      other: allPayments.filter(p => !['active', 'completed', 'pending_signup', 'pending_user_match'].includes(p.status)).length
    };

    // Get pending payments (users who paid but haven't signed up)
    const pendingPayments = allPayments.filter(p => 
      p.userId?.startsWith('pending_') || p.status === 'pending_signup'
    );

    // Get active/completed payments (successful payments)
    const successfulPayments = allPayments.filter(p => 
      p.status === 'active' || p.status === 'completed'
    );

    // Calculate revenue (assuming $4.20 per payment)
    const totalRevenue = successfulPayments.length * 4.20;

    console.log(`💰 PAYMENT SUMMARY:
    - Total Payments: ${paymentStats.total}
    - Active Payments: ${paymentStats.active}
    - Pending Payments: ${pendingPayments.length}
    - Revenue: $${totalRevenue.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      summary: {
        totalPayments: paymentStats.total,
        paidUsers: successfulPayments.length,
        pendingUsers: pendingPayments.length,
        totalRevenue: totalRevenue,
        paymentsByStatus: paymentStats
      },
      payments: {
        successful: successfulPayments.map(p => ({
          paymentId: p.paymentId,
          email: p.userEmail || 'Unknown',
          name: p.userName || 'Unknown',
          status: p.status,
          date: p.createdAt?.toISOString()
        })),
        pending: pendingPayments.map(p => ({
          paymentId: p.paymentId,
          email: p.userId?.replace('pending_', '') || 'Unknown',
          status: p.status,
          date: p.createdAt?.toISOString()
        }))
      }
    });

  } catch (error) {
    console.error('❌ PAYMENT CHECK ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check payment data'
    }, { status: 500 });
  }
} 