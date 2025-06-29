import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { payment, sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Authenticate & ensure the user is premium
  const session = await auth.api.getSession({ headers: new Headers(req.headers) });
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  let isPremium = false;

  // Check if user is a sudo user
  if (userEmail) {
    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, userEmail.toLowerCase()))
      .limit(1);

    if (sudoUser.length > 0) {
      isPremium = true;
    }
  }

  // If not sudo user, check payment status
  if (!isPremium) {
    const latestPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, session.user.id))
      .orderBy(payment.createdAt)
      .limit(1);

    if (latestPayment.length > 0 && latestPayment[0].status === "active") {
      isPremium = true;
    }
  }

  if (!isPremium) {
    return NextResponse.json({ error: "Forbidden: Premium subscription required" }, { status: 403 });
  }

  const body = await req.json();

  // Forward to backend – expect 202 w/ { id }
  const backendRes = await fetch(`${process.env.BACKEND_API_URL}/api/clip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await backendRes.json();
  return NextResponse.json(json, { status: backendRes.status });
} 