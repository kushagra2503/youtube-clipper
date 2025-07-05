import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { dodopayments } from "@/lib/dodopayments";
import db from "@/lib/db";
import { payment, user } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);

export async function POST(request: Request) {
  const headersList = await headers();

  try {
    const rawBody = await request.text();
    const webhookHeaders = {
      "webhook-id": headersList.get("webhook-id") || "",
      "webhook-signature": headersList.get("webhook-signature") || "",
      "webhook-timestamp": headersList.get("webhook-timestamp") || "",
    };

    await webhook.verify(rawBody, webhookHeaders);
    const payload = JSON.parse(rawBody);

    switch (payload.type) {
      case "payment.completed":
      case "payment.succeeded": {
        const paymentData = await dodopayments.payments.retrieve(payload.data.payment_id);
        
        console.log("-------PAYMENT SUCCESS START ---------");
        console.log('Full payment data:', JSON.stringify(paymentData, null, 2));
        console.log('Metadata:', paymentData.metadata);
        console.log('User ID from metadata:', paymentData.metadata?.user_id);
        console.log("-------PAYMENT SUCCESS END ---------");

        const userId = paymentData.metadata.user_id;
        const customerEmail = paymentData.customer?.email;

        console.log('Looking for user with ID:', userId);
        console.log('Customer email:', customerEmail);

        // First try to find by userId, then by email as fallback
        let targetUserId = userId;
        
        if (!userId && customerEmail) {
          // If no userId in metadata, find user by email
          const userByEmail = await db
            .select()
            .from(user)
            .where(eq(user.email, customerEmail))
            .limit(1);
          
          if (userByEmail.length > 0) {
            targetUserId = userByEmail[0].id;
            console.log('Found user by email, using userId:', targetUserId);
          }
        } else if (userId && customerEmail) {
          // Even if we have userId, double-check it matches the email
          const userByEmail = await db
            .select()
            .from(user)
            .where(eq(user.email, customerEmail))
            .limit(1);
          
          if (userByEmail.length > 0 && userByEmail[0].id !== userId) {
            console.warn(`User ID mismatch! Metadata: ${userId}, Email lookup: ${userByEmail[0].id}`);
            targetUserId = userByEmail[0].id;
            console.log('Using email-based userId for consistency:', targetUserId);
          }
        }

        if (!targetUserId) {
          console.error('No valid user ID found for payment');
          console.error('Payment data:', { userId, customerEmail, paymentId: payload.data.payment_id });
          
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
            console.log(`Payment will be auto-activated when user signs up with this email`);
          }
          break;
        }

        console.log('Processing payment for user:', targetUserId);

        // Update or create payment record
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
              id: payload.data.payment_id || existingPayment[0].id // Update with actual payment ID
            })
            .where(eq(payment.userId, targetUserId));
          console.log('Payment record updated successfully');
        } else {
          console.log('Creating new payment record');
          await db.insert(payment).values({
            id: payload.data.payment_id || uuidv4(),
            userId: targetUserId,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log('Payment record created successfully');
        }

        // Log successful purchase for analytics
        const userData = await db
          .select()
          .from(user)
          .where(eq(user.id, targetUserId))
          .limit(1);

        if (userData.length > 0) {
          console.log(`✅ PURCHASE SUCCESS: ${userData[0].email} purchased QuackQuery Pro for $4.20`);
        }

        break;
      }
      case "payment.failed":
      case "payment.cancelled": {
        const paymentData = await dodopayments.payments.retrieve(payload.data.payment_id);
        const userId = paymentData.metadata.user_id;

        console.log(`❌ PAYMENT FAILED: ${payload.type} for user ${userId}`);

        // Update payment status to failed/cancelled
        const existingPayment = await db
          .select()
          .from(payment)
          .where(eq(payment.userId, userId))
          .limit(1);

        if (existingPayment.length > 0) {
          await db
            .update(payment)
            .set({ status: payload.type.split(".")[1], updatedAt: new Date() })
            .where(eq(payment.userId, userId));
        } else {
          await db.insert(payment).values({
            id: payload.data.payment_id || uuidv4(),
            userId: userId,
            status: payload.type.split(".")[1],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        break;
      }
      default:
        console.log(`Unhandled webhook event: ${payload.type}`);
    }

    return Response.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error) {
    console.error("----- Webhook verification failed -----");
    console.error(error);
    return Response.json({ message: "Webhook failed" }, { status: 400 });
  }
}
