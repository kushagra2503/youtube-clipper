import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/lib/db";
import { payment, sudoUsers, user } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  console.log('=== DEBUG USER INFO START ===');
  
  const incomingHeaders = await headers();
  const session = await auth.api.getSession({ headers: new Headers(incomingHeaders) });

  console.log('Session check:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email
  });

  if (!session || !session.user) {
    console.log('No session - returning 401');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  console.log('Processing for user:', { userId, userEmail });

  try {
    // Check if user is a sudo user
    let isSudo = false;
    if (userEmail) {
      console.log('Checking sudo status for:', userEmail);
      const sudoUser = await db
        .select()
        .from(sudoUsers)
        .where(eq(sudoUsers.email, userEmail.toLowerCase()))
        .limit(1);

      isSudo = sudoUser.length > 0;
      console.log('Sudo check result:', { isSudo, sudoRecords: sudoUser.length });
    }

    // Check if user is an admin
    console.log('Checking admin status for userId:', userId);
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const isAdmin = dbUser.length > 0 && dbUser[0].isAdmin;
    console.log('Admin check result:', { isAdmin, userRecords: dbUser.length });

    // Check if user has active payment
    console.log('Checking payment status for userId:', userId);
    let lifetimeAccess = false;
    let purchaseDate = null;
    const userPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId))
      .orderBy(sql`${payment.createdAt} DESC`)
      .limit(1);

    console.log('Payment check result:', {
      paymentRecords: userPayment.length,
      payments: userPayment
    });

    if (userPayment.length > 0 && userPayment[0].status === "active") {
      lifetimeAccess = true;
      purchaseDate = userPayment[0].createdAt;
      console.log('Found active payment:', userPayment[0]);
    }

    const canDownload = lifetimeAccess || isSudo || isAdmin;
    console.log('Final calculation:', {
      lifetimeAccess,
      isSudo,
      isAdmin,
      canDownload
    });

    console.log('=== DEBUG USER INFO END ===');

    return NextResponse.json({
      canDownload,
      plan: lifetimeAccess ? 'pro' : 'free',
      requiresPayment: !canDownload,
      lifetimeAccess,
      purchaseDate,
      isSudo,
      isAdmin,
      userId,
      userEmail,
      debug: {
        sessionFound: true,
        paymentRecordsCount: userPayment.length,
        paymentStatuses: userPayment.map(p => p.status),
        calculation: { lifetimeAccess, isSudo, isAdmin, result: canDownload }
      }
    });

  } catch (error) {
    console.error('=== DEBUG USER INFO ERROR ===');
    console.error(error);
    return NextResponse.json({
      error: "Database error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 