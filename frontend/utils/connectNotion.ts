const NOTION_CLIENT_ID = "236d872b-594c-80b5-98a1-00375b3c6358";
const REDIRECT_URI = "http://localhost:3000/oauth/notion-callback/"; // ✅ Added trailing slash
const NOTION_OAUTH_URL = `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

export async function ConnectNotion({
  name,
}: {
  name: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    // Store username for the callback page
    localStorage.setItem("oauth_username", name);

    // Open popup
    const popup = window.open(
      NOTION_OAUTH_URL,
      "notion-oauth",
      "width=600,height=700",
    );

    // ✅ Simplified: Only listen for success/error messages from callback page
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      console.log("🔍 Received message:", event.data);

      if (event.data.type === "OAUTH_SUCCESS") {
        window.removeEventListener("message", messageHandler);
        clearInterval(checkPopup);
        resolve(true);
      } else if (event.data.type === "OAUTH_ERROR") {
        window.removeEventListener("message", messageHandler);
        clearInterval(checkPopup);
        resolve(false);
      }
    };

    // Check if popup is closed manually
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        window.removeEventListener("message", messageHandler);
        resolve(false);
      }
    }, 1000);

    window.addEventListener("message", messageHandler);
  });
}

export async function handleNotionOAuthCallback(
  params: URLSearchParams,
  username: string,
): Promise<void> {
  const code = params.get("code");
  const error = params.get("error");

  // ✅ Check for OAuth errors first
  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (!code) {
    throw new Error("No authorization code provided.");
  }

  console.log(
    "🔍 Processing OAuth callback with code:",
    code.substring(0, 20) + "...",
  );

  const res = await fetch("/api/integrations/notion/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user: username }),
  });

  const data = await res.json();

  console.log("🔍 API Response:", data);

  if (!data.success) {
    throw new Error(data.message || "Failed to connect Notion");
  }

  console.log("✅ Notion connected successfully!", data);
}
