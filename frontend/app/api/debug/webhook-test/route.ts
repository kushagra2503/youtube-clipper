import { NextRequest, NextResponse } from 'next/server';
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('🧪 WEBHOOK TEST: Processing payment:', JSON.stringify(payload, null, 2));

    // Simulate DodoPayments data structure
    const mockPaymentData = {
      metadata: { user_id: null }, // No user_id in test
      customer: { email: payload.data.customer_email },
      id: payload.data.payment_id,
      status: 'completed'
    };

    const customerEmail = payload.data.customer_email;
    
    console.log('Customer email:', customerEmail);

    // Try to find user by email since we don't have user_id
    let targetUserId = null;
    
    if (customerEmail) {
      const userByEmail = await db
        .select()
        .from(user)
        .where(eq(user.email, customerEmail))
        .limit(1);
      
      if (userByEmail.length > 0) {
        targetUserId = userByEmail[0].id;
        console.log('✅ Found existing user by email:', targetUserId);
      }
    }

    if (!targetUserId) {
      console.log('❌ No user found, creating pending payment');
      
      // Create a pending payment record that will be auto-linked when user signs up
      if (customerEmail) {
        const pendingPaymentId = payload.data.payment_id || uuidv4();
        
        await db.insert(payment).values({
          id: pendingPaymentId,
          userId: `pending_${customerEmail}`, // Temporary user ID with email
          status: "pending_signup",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`✅ PENDING PAYMENT: Created pending payment for ${customerEmail}`);
        return NextResponse.json({ 
          message: "Pending payment created - will activate when user signs up",
          status: "pending_signup",
          email: customerEmail
        });
      }
    } else {
      console.log('✅ Processing payment for existing user:', targetUserId);

      // Check for existing payment
      const existingPayment = await db
        .select()
        .from(payment)
        .where(eq(payment.userId, targetUserId))
        .limit(1);

      if (existingPayment.length > 0) {
        console.log('Updating existing payment record');
        await db
          .update(payment)
          .set({ 
            status: "active", 
            updatedAt: new Date(),
            id: payload.data.payment_id || existingPayment[0].id
          })
          .where(eq(payment.userId, targetUserId));
      } else {
        console.log('Creating new payment record');
        await db.insert(payment).values({
          id: payload.data.payment_id || uuidv4(),
          userId: targetUserId,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`✅ PAYMENT SUCCESS: ${customerEmail} activated for downloads`);
      return NextResponse.json({ 
        message: "Payment processed successfully",
        status: "active",
        email: customerEmail,
        userId: targetUserId
      });
    }

    return NextResponse.json({ message: "Payment processed" });

  } catch (error) {
    console.error('❌ WEBHOOK TEST ERROR:', error);
    return NextResponse.json({
      message: "Webhook test failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 