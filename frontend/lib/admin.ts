import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function checkIsAdmin(headers: Headers): Promise<{ isAdmin: boolean; user?: any; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers });
    
    if (!session || !session.user) {
      return { isAdmin: false, error: "Unauthorized" };
    }

    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (dbUser.length === 0) {
      return { isAdmin: false, error: "User not found" };
    }

    return { 
      isAdmin: dbUser[0].isAdmin || false, 
      user: session.user 
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, error: "Internal server error" };
  }
} 