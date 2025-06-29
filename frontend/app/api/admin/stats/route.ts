import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { user, payment, sudoUsers, session } from "@/lib/schema";
import { eq, count, gte, sql } from "drizzle-orm";
import { checkIsAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkIsAdmin(req.headers);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 });
    }

    // Get total users count
    const totalUsersResult = await db.select({ count: count() }).from(user);
    const totalUsers = totalUsersResult[0].count;

    // Get users who have logged in (have sessions)
    const signedInUsersResult = await db
      .select({ count: count() })
      .from(user)
      .innerJoin(session, eq(user.id, session.userId));
    const totalSignedInUsers = signedInUsersResult[0].count;

    // Get users with active payments (lifetime access)
    const purchasedUsersResult = await db
      .select({ count: count() })
      .from(payment)
      .where(eq(payment.status, "active"));
    const totalPurchasedUsers = purchasedUsersResult[0].count;

    // Get sudo users count
    const sudoUsersResult = await db.select({ count: count() }).from(sudoUsers);
    const totalSudoUsers = sudoUsersResult[0].count;

    // Get admin users count
    const adminUsersResult = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.isAdmin, true));
    const totalAdminUsers = adminUsersResult[0].count;

    // Calculate revenue (purchased users * $5.20)
    const totalRevenue = totalPurchasedUsers * 5.20;

    // Get plan distribution
    const allUsers = await db
      .select({
        id: user.id,
        hasPayment: payment.status
      })
      .from(user)
      .leftJoin(payment, eq(user.id, payment.userId));

    const planCounts = allUsers.reduce((acc, u) => {
      const plan = u.hasPayment === "active" ? "pro" : "free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, { free: 0, pro: 0, enterprise: 0 });

    // Get recent users (last 15)
    const recentUsers = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isAdmin: user.isAdmin,
        paymentStatus: payment.status,
        paymentDate: payment.createdAt
      })
      .from(user)
      .leftJoin(payment, eq(user.id, payment.userId))
      .orderBy(sql`${user.createdAt} DESC`)
      .limit(15);

    // Get recent purchases (last 10)
    const recentPurchases = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        purchaseDate: payment.createdAt,
        paymentId: payment.id
      })
      .from(payment)
      .innerJoin(user, eq(payment.userId, user.id))
      .where(eq(payment.status, "active"))
      .orderBy(sql`${payment.createdAt} DESC`)
      .limit(10);

    // Get sudo users list
    const sudoUsersList = await db
      .select({
        id: sudoUsers.id,
        email: sudoUsers.email,
        createdAt: sudoUsers.createdAt
      })
      .from(sudoUsers)
      .orderBy(sql`${sudoUsers.createdAt} DESC`);

    // Get daily signups for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignupsData = await db
      .select({
        date: sql<string>`DATE(${user.createdAt})`,
        count: count()
      })
      .from(user)
      .where(gte(user.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${user.createdAt})`);

    const dailySignups = dailySignupsData.reduce((acc, item) => {
      acc[item.date] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Mock download stats (since we don't have download tracking in DB yet)
    const downloadStats = {
      totalDownloads: totalPurchasedUsers + totalSudoUsers,
      dailyDownloads: {
        [new Date().toISOString().split('T')[0]]: Math.floor(totalPurchasedUsers * 0.1)
      },
      planDistribution: { free: 0, pro: totalPurchasedUsers, enterprise: 0 }
    };

    return NextResponse.json({
      totalUsers,
      totalSignedInUsers,
      totalPurchasedUsers,
      totalSudoUsers,
      totalAdminUsers,
      planCounts,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      downloadStats,
      dailySignups,
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.paymentStatus === "active" ? "pro" : "free",
        createdAt: u.createdAt.toISOString(),
        lifetimeAccess: u.paymentStatus === "active",
        purchaseDate: u.paymentDate?.toISOString(),
        isAdmin: u.isAdmin,
        isSudo: false // Will be updated in next iteration
      })),
      recentPurchases: recentPurchases.map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        plan: "pro",
        purchaseDate: p.purchaseDate.toISOString(),
        paymentId: p.paymentId
      })),
      sudoUsers: sudoUsersList.map(s => ({
        id: s.id,
        email: s.email,
        name: s.email.split('@')[0], // Use email prefix as name
        createdAt: s.createdAt.toISOString(),
        lastLogin: null, // Could be enhanced with session data
        isAdmin: false // Sudo users are separate from admin users
      }))
    });

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 