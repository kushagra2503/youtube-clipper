import { NextRequest, NextResponse } from "next/server";
const NOTION_CLIENT_SECRET =
  "secret_I89BNnSV5kkeQabmDLnsrd6se42gcTHhFKVv6Yb5R2c";

const NOTION_CLIENT_ID = "236d872b-594c-80b5-98a1-00375b3c6358";

const REDIRECT_URI = "http://localhost:3000/oauth/notion-callback/";

export async function POST(request: NextRequest) {
  try {
    const { code, user } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Missing code" },
        { status: 400 },
      );
    }

    console.log("🔍 Exchanging code for token...");
    console.log("🔍 Using redirect URI:", REDIRECT_URI);

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

    const text = await response.text();
    console.log("🔍 Raw Notion Response:", text);
    console.log("📊 Response status:", response.status);

    if (!response.ok) {
      console.error("❌ Notion API error:", response.status, text);
      return NextResponse.json(
        {
          success: false,
          message: `Notion API returned ${response.status}`,
          raw: text,
        },
        { status: 500 },
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Notion did not return valid JSON",
          raw: text,
        },
        { status: 500 },
      );
    }

    if (data.access_token) {
      console.log(`✅ Successfully got Notion token for ${user}`);

      return NextResponse.json({
        success: true,
        token: data.access_token,
        workspace_name: data.workspace_name,
        workspace_id: data.workspace_id,
      });
    } else {
      console.error("❌ No access token in response:", data);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get token",
          data,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("❌ Notion OAuth error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
