import { NextResponse } from 'next/server';
import { dodopayments } from '@/lib/dodopayments';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Purchase request body:', JSON.stringify(body));

    const incomingHeaders = await headers();
    const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized or user email missing" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check if user already has an active payment
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId))
      .limit(1);

    if (existingPayment.length > 0 && existingPayment[0].status === "active") {
      return NextResponse.json({ 
        error: "User already has lifetime access" 
      }, { status: 409 });
    }

    // Create a one-time payment instead of a subscription
    const response = await dodopayments.payments.create({
      billing: {
        city: body.billing.city,
        country: body.billing.country || "US",
        state: body.billing.state,
        street: body.billing.street,
        zipcode: body.billing.zipcode,
      },
      customer: {
        email: body.customer.email || userEmail,
        name: body.customer.name,
      },
      product_id: body.product_id,
      quantity: body.quantity,
      payment_link: true,
      metadata: {
        user_id: userId,
        payment_type: "one_time",
        plan_type: body.product_id === "pro_monthly" ? "pro" : "enterprise"
      },
    });

    // Create a pending payment record in the database
    if (response.payment_link) {
      await db.insert(payment).values({
        id: uuidv4(),
        userId: userId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
} 