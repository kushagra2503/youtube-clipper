import { NextRequest, NextResponse } from 'next/server';
import db from "@/lib/db";
import { user, payment } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking DodoPayments data...');

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
      other_statuses: allPayments.filter(p => !['active', 'completed', 'pending_signup', 'pending_user_match'].includes(p.status))
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
    - Active/Completed Payments: ${successfulPayments.length}
    - Pending Payments: ${pendingPayments.length}
    - Revenue: $${totalRevenue.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: "DodoPayments Analysis Complete",
      summary: {
        totalPayments: paymentStats.total,
        paidUsers: successfulPayments.length,
        pendingUsers: pendingPayments.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        paymentsByStatus: {
          active: paymentStats.active,
          completed: paymentStats.completed,
          pending_signup: paymentStats.pending_signup,
          pending_user_match: paymentStats.pending_user_match,
          other: paymentStats.other_statuses.length
        }
      },
      details: {
        successful_payments: successfulPayments.map(p => ({
          paymentId: p.paymentId,
          email: p.userEmail || 'Unknown',
          name: p.userName || 'Unknown', 
          status: p.status,
          date: p.createdAt?.toISOString(),
          isLinkedToUser: !p.userId?.startsWith('pending_')
        })),
        pending_payments: pendingPayments.map(p => ({
          paymentId: p.paymentId,
          email: p.userId?.replace('pending_', '') || 'Unknown',
          status: p.status,
          date: p.createdAt?.toISOString(),
          needsActivation: true
        })),
        all_payment_statuses: [...new Set(allPayments.map(p => p.status))]
      }
    });

  } catch (error) {
    console.error('❌ PAYMENT DEBUG ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check payment data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 