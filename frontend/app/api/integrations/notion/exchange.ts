import type { NextApiRequest, NextApiResponse } from "next";

const NOTION_CLIENT_ID = "236d872b-594c-80b5-98a1-00375b3c6358";
const NOTION_CLIENT_SECRET =
  "secret_Al6YeUdmkVeLHjmkyvORGak3CyfN1RHVjwLZFQimhJ9";
const REDIRECT_URI = "http://localhost:3000/oauth/notion-callback";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { code, user } = req.body;
  if (!code)
    return res.status(400).json({ success: false, message: "Missing code" });

  try {
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`)}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      console.log(`✅ Saved Notion token for ${user}:`, data.access_token);

      // 👉 Store token in DB (Supabase, Prisma, etc.) as per your existing structure
      // await saveIntegrationToken(user, "notion", data.access_token);

      return res.status(200).json({ success: true, token: data.access_token });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Failed to get token", data });
    }
  } catch (error) {
    console.error("❌ Notion OAuth error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
