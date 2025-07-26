import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sudoUsers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ✅ Handle Preflight (OPTIONS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// ✅ Handle POST Request
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const sudoUser = await db
      .select()
      .from(sudoUsers)
      .where(eq(sudoUsers.email, email.toLowerCase()))
      .limit(1);

    return NextResponse.json(
      sudoUser.length > 0
        ? { isPremium: true, isSudoUser: true }
        : { isPremium: false, isSudoUser: false },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", // ✅ Allow from anywhere
        },
      },
    );
  } catch (error) {
    console.error("Error checking premium/sudo status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
