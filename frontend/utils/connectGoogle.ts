// Modified connectGoogle.ts - Save Access Token instead of Refresh Token

import { saveToken } from "./db";

// Google OAuth Configuration
const GOOGLE_CLIENT_ID =
  "401330684675-fg8cd3tlr7iutj9l9ckh3rop07q7ctfj.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
// const GOOGLE_REDIRECT_URI = window.location.origin + "/oauth/callback";
const GOOGLE_REDIRECT_URI =
  typeof window !== "undefined"
    ? window.location.origin + "/oauth/callback"
    : ""; // Fallback for SSR

// Google OAuth scopes
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// Generate a unique state parameter for security
function generateState(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Create Google OAuth URL
function createGoogleOAuthURL(): string {
  const state = generateState();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // Keep this for getting refresh token if needed later
    prompt: "consent",
    include_granted_scopes: "true",
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Token exchange failed: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}

// Handle OAuth callback (call this from your callback route/component)
export async function handleOAuthCallback(
  urlParams: URLSearchParams,
  username: string,
): Promise<void> {
  const code = urlParams.get("code");
  const error = urlParams.get("error");

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (!code) {
    throw new Error("Authorization code not received");
  }

  console.log("🔄 Exchanging authorization code for tokens...");
  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.access_token) {
    throw new Error("Access token not received from Google");
  }

  console.log(
    "🎉 OAuth successful! Access token received:",
    tokens.access_token.substring(0, 20) + "...", // Log partial token for security
  );

  // Save access token to database instead of refresh token
  await saveToken(username, "Google Calendar", tokens.access_token);
  console.log("✅ Access token saved to database");

  // Optional: Also save expiration time if you want to track token validity
  if (tokens.expires_in) {
    const expirationTime = new Date(Date.now() + tokens.expires_in * 1000);
    console.log(`📅 Token expires at: ${expirationTime.toISOString()}`);

    // You might want to save this expiration time as well
    // await saveTokenExpiration(username, "Google Calendar", expirationTime);
  }
}

// Main OAuth function
export async function ConnectGoogle({
  name,
}: {
  name: string;
}): Promise<boolean> {
  try {
    console.log("🚀 Starting Google OAuth process...");

    localStorage.setItem("oauth_username", name);
    const authUrl = createGoogleOAuthURL();

    const popup = window.open(
      authUrl,
      "google-oauth",
      "width=500,height=600,scrollbars=yes,resizable=yes",
    );

    if (!popup) {
      throw new Error("Popup blocked. Please allow popups for this site.");
    }

    // Wait for success/error message from popup
    const result = await new Promise<{ success: boolean }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false });
      }, 60_000); // fallback timeout

      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "OAUTH_SUCCESS") {
          clearTimeout(timeout);
          window.removeEventListener("message", listener);
          resolve({ success: true });
        }

        if (event.data?.type === "OAUTH_ERROR") {
          clearTimeout(timeout);
          window.removeEventListener("message", listener);
          resolve({ success: false });
        }
      };

      window.addEventListener("message", listener);
    });

    return result.success;
  } catch (error) {
    console.error("❌ Google OAuth error:", error);
    return false;
  }
}

// Optional: Helper function to refresh access token if you have refresh token stored elsewhere
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Token refresh failed: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}
