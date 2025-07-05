import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { userEmail, paymentId } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail required" }, { status: 400 });
    }

    console.log('Testing payment processing for:', userEmail);

    // Find user by email
    const userByEmail = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail.toLowerCase()))
      .limit(1);
    
    if (userByEmail.length === 0) {
      return NextResponse.json({ 
        error: "User not found", 
        email: userEmail 
      }, { status: 404 });
    }

    const targetUserId = userByEmail[0].id;
    console.log('Found user:', { id: targetUserId, email: userEmail });

    // Check for existing payment
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, targetUserId))
      .limit(1);

    let result;

    if (existingPayment.length > 0) {
      console.log('Updating existing payment record');
      await db
        .update(payment)
        .set({ 
          status: "active", 
          updatedAt: new Date(),
          id: paymentId || existingPayment[0].id
        })
        .where(eq(payment.userId, targetUserId));
      
      result = { action: "updated", paymentId: existingPayment[0].id };
    } else {
      console.log('Creating new payment record');
      const newPaymentId = paymentId || uuidv4();
      await db.insert(payment).values({
        id: newPaymentId,
        userId: targetUserId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      result = { action: "created", paymentId: newPaymentId };
    }

    // Verify the payment was processed
    const verifyPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, targetUserId))
      .limit(1);

    console.log(`✅ TEST PAYMENT SUCCESS: ${userEmail} payment processed`);

    return NextResponse.json({
      success: true,
      message: `Payment processed for ${userEmail}`,
      userId: targetUserId,
      userEmail,
      result,
      verification: {
        hasPayment: verifyPayment.length > 0,
        paymentStatus: verifyPayment[0]?.status,
        paymentId: verifyPayment[0]?.id
      }
    });

  } catch (error) {
    console.error('Test payment error:', error);
    return NextResponse.json({ 
      error: "Failed to process test payment",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 