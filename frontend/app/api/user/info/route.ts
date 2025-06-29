import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, sudoUsers, user } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const incomingHeaders = await headers();
  const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  // Check if user is a sudo user
  let isSudo = false;
  if (userEmail) {
    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, userEmail.toLowerCase()))
      .limit(1);

    if (sudoUser.length > 0) {
      isSudo = true;
    }
  }

  // Check if user is an admin
  const dbUser = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const isAdmin = dbUser.length > 0 && dbUser[0].isAdmin;

  // Check if user has active payment
  let lifetimeAccess = false;
  let purchaseDate = null;
  const userPayment = await db
    .select()
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(sql`${payment.createdAt} DESC`)
    .limit(1);

  if (userPayment.length > 0 && userPayment[0].status === "active") {
    lifetimeAccess = true;
    purchaseDate = userPayment[0].createdAt;
  }

  const canDownload = lifetimeAccess || isSudo || isAdmin;

  return NextResponse.json({
    canDownload,
    plan: lifetimeAccess ? 'pro' : 'free',
    requiresPayment: !canDownload,
    lifetimeAccess,
    purchaseDate,
    isSudo,
    isAdmin,
    userId,
    userEmail
  });
} 