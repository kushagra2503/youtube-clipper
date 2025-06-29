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
        console.log(paymentData);
        console.log("-------PAYMENT SUCCESS END ---------");

        const userId = paymentData.metadata.user_id;

        // Update or create payment record
        const existingPayment = await db
          .select()
          .from(payment)
          .where(eq(payment.userId, userId))
          .limit(1);

        if (existingPayment.length > 0) {
          await db
            .update(payment)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(payment.userId, userId));
        } else {
          await db.insert(payment).values({
            id: payload.data.payment_id || uuidv4(),
            userId: userId,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Log successful purchase for analytics
        const userData = await db
          .select()
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (userData.length > 0) {
          console.log(`✅ PURCHASE SUCCESS: ${userData[0].email} purchased QuackQuery Pro for $5.20`);
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
