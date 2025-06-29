import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const incomingHeaders = await headers();
  const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  // Check if user is a sudo user
  if (userEmail) {
    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, userEmail.toLowerCase()))
      .limit(1);

    if (sudoUser.length > 0) {
      return NextResponse.json({ isPremium: true, isSudoUser: true });
    }
  }

  // Check if user has active payment
  const userPayment = await db
    .select()
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(payment.createdAt)
    .limit(1);

  if (userPayment.length > 0 && userPayment[0].status === "active") {
    return NextResponse.json({ isPremium: true, isSudoUser: false });
  }

  return NextResponse.json({ isPremium: false, isSudoUser: false });
}
