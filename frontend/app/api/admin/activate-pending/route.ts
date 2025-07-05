import { NextRequest, NextResponse } from 'next/server';
import db from "@/lib/db";
import { user, payment } from "@/lib/schema";
import { eq, and, like } from "drizzle-orm";
import { checkIsAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  try {
    // Check admin access first
    const adminCheck = await checkIsAdmin(request.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    console.log('🔄 MANUAL ACTIVATION: Starting pending payment activation check...');
    
    // Get all pending payments
    const pendingPayments = await db
      .select()
      .from(payment)
      .where(
        and(
          like(payment.userId, 'pending_%'),
          eq(payment.status, "pending_signup")
        )
      );

    console.log(`Found ${pendingPayments.length} pending payments to process`);

    let activatedCount = 0;
    const results = [];

    for (const pendingPayment of pendingPayments) {
      // Extract email from pending user ID format: "pending_email@example.com"
      const email = pendingPayment.userId.replace('pending_', '');
      
      // Find user with this email
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        const user = existingUser[0];
        console.log(`✅ Found user for email ${email}, activating...`);
        
        // Update payment to link to real user and activate it
        await db
          .update(payment)
          .set({
            userId: user.id,
            status: "active", // This gives lifetime access
            updatedAt: new Date()
          })
          .where(eq(payment.id, pendingPayment.id));

        activatedCount++;
        results.push({
          email,
          paymentId: pendingPayment.id,
          userId: user.id,
          status: 'activated'
        });
        
        console.log(`🎉 Activated payment ${pendingPayment.id} for user ${email}`);
      } else {
        console.log(`❌ No user found for email ${email}`);
        results.push({
          email,
          paymentId: pendingPayment.id,
          status: 'user_not_found'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${activatedCount} pending payments`,
      totalPending: pendingPayments.length,
      activated: activatedCount,
      results
    });

  } catch (error) {
    console.error('❌ ACTIVATION ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to activate pending payments'
    }, { status: 500 });
  }
} 