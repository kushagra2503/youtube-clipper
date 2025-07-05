import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { userEmail, userId } = await request.json();
    
    if (!userEmail && !userId) {
      return Response.json({ error: "Either userEmail or userId required" }, { status: 400 });
    }

    let targetUserId = userId;
    
    if (!targetUserId && userEmail) {
      // Find user by email
      const userByEmail = await db
        .select()
        .from(user)
        .where(eq(user.email, userEmail))
        .limit(1);
      
      if (userByEmail.length > 0) {
        targetUserId = userByEmail[0].id;
      }
    }

    if (!targetUserId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check if payment already exists
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, targetUserId))
      .limit(1);

    if (existingPayment.length > 0) {
      // Update existing payment to active
      await db
        .update(payment)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(payment.userId, targetUserId));
      
      console.log('✅ Manually activated existing payment for user:', targetUserId);
    } else {
      // Create new payment record
      await db.insert(payment).values({
        id: uuidv4(),
        userId: targetUserId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('✅ Manually created payment record for user:', targetUserId);
    }

    // Get user info for response
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    return Response.json({ 
      success: true, 
      message: `Payment activated for ${userData[0]?.email}`,
      userId: targetUserId
    });

  } catch (error) {
    console.error('Manual activation error:', error);
    return Response.json({ error: "Failed to activate payment" }, { status: 500 });
  }
} 