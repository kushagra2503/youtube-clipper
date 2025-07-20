const NOTION_CLIENT_ID = "236d872b-594c-80b5-98a1-00375b3c6358";
const REDIRECT_URI = process.env.NEXT_PUBLIC_NOTION_REDIRECT_URI!;

const NOTION_OAUTH_URL =
  "https://api.notion.com/v1/oauth/authorize?client_id=236d872b-594c-80b5-98a1-00375b3c6358&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fnotion-callback%2F";

export async function ConnectNotion({
  name,
}: {
  name: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    localStorage.setItem("oauth_username", name);
    const popup = window.open(
      NOTION_OAUTH_URL,
      "notion-oauth",
      "width=600,height=700",
    );

    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        resolve(false);
      }
    }, 500);

    const messageHandler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { code } = event.data;

      if (code) {
        window.removeEventListener("message", messageHandler);
        clearInterval(checkPopup);

        try {
          const res = await fetch("/api/integrations/notion/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, user: name }),
          });

          const data = await res.json();
          if (data.success) {
            console.log("✅ Notion connected!", data);
            popup?.close();
            resolve(true);
          } else {
            console.error("❌ Notion connection failed:", data);
            popup?.close();
            resolve(false);
          }
        } catch (err) {
          console.error("❌ Error connecting Notion:", err);
          popup?.close();
          resolve(false);
        }
      }
    };

    window.addEventListener("message", messageHandler);
  });
}

export async function handleNotionOAuthCallback(
  params: URLSearchParams,
  username: string,
): Promise<void> {
  const code = params.get("code");
  if (!code) throw new Error("No authorization code provided.");

  const res = await fetch("/api/integrations/notion/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user: username }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to connect Notion");
  }

  console.log("✅ Notion connected!", data);
}
