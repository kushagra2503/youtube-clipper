"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { handleNotionOAuthCallback } from "@/utils/connectNotion";

function NotionOAuthCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing Notion authentication...");

  useEffect(() => {
    const processCallback = async () => {
      try {
        const username = localStorage.getItem("oauth_username");
        if (!username) {
          throw new Error("Username not found. Please try again.");
        }

        const params = new URLSearchParams(Array.from(searchParams.entries()));
        await handleNotionOAuthCallback(params, username);

        localStorage.removeItem("oauth_username");

        setStatus("success");
        setMessage("Authentication successful! Notion connected.");
        console.log("✅ Notion Connected!");

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_SUCCESS",
              message: "Notion connected successfully!",
            },
            "*",
          );
        }

        setTimeout(() => window.close(), 2000);
      } catch (error) {
        localStorage.removeItem("oauth_username");

        setStatus("error");
        setMessage(
          `Authentication failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Authentication failed",
            },
            "*",
          );
        }

        setTimeout(() => window.close(), 3000);
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "50px",
        textAlign: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "40px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {status === "loading" && (
          <>
            <h2>🔄 Connecting to Notion</h2>
            <p>{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <h2>🎉 Connected Successfully!</h2>
            <p style={{ color: "#90EE90" }}>Notion connected successfully!</p>
            <p>You can now close this window.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h2>❌ Authentication Failed</h2>
            <p style={{ color: "#ffcccb" }}>{message}</p>
            <p>You can close this window and try again.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <NotionOAuthCallback />;
}
