"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Navbar from "@/components/core-ui/navbar";
import { ConnectGoogle } from "@/utils/connectGoogle";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface Integration {
  name: string;
  connected: boolean;
}

export default function IntegrationPage() {
  const { data: session } = authClient.useSession();
  const [userName, setUserName] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([
    { name: "Google", connected: false },
    { name: "Notion", connected: false },
    { name: "Twitter", connected: false },
  ]);

  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name);
    }
  }, [session]);

  async function handleConnect(integrationName: string) {
    if (!userName) {
      alert("You need to be logged in to connect integrations.");
      return;
    }

    try {
      if (integrationName === "Google") {
        console.log("🔗 Starting Google connection...");
        const success = await ConnectGoogle({ name: userName });

        if (success) {
          console.log("✅ Google Calendar connected!");
          setIntegrations((prev) =>
            prev.map((i) =>
              i.name === integrationName ? { ...i, connected: true } : i,
            ),
          );
        } else {
          console.warn("⚠️ Google connection failed or cancelled.");
        }
      } else {
        alert(`${integrationName} integration not implemented yet.`);
      }
    } catch (err) {
      console.error(`❌ Failed to connect ${integrationName}:`, err);
      alert(`Failed to connect ${integrationName}. Check console for details.`);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8 pt-28">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-6">Integrations</h1>

            {userName && (
              <motion.p
                className="text-white mb-4"
                variants={fadeUpVariants}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Welcome, <span className="font-semibold">{userName}</span>!
              </motion.p>
            )}

            <p className="text-white/80 mb-6">
              Connect your favorite services to enhance your workflow.
            </p>

            <div className="space-y-4">
              {integrations.map((integration, index) => (
                <motion.div
                  key={integration.name}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10"
                  variants={fadeUpVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <span className="text-white text-lg">{integration.name}</span>
                  <Button
                    className={`${
                      integration.connected
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-white text-purple-600 hover:bg-white/90"
                    }`}
                    size="sm"
                    onClick={() => handleConnect(integration.name)}
                    disabled={integration.connected}
                  >
                    {integration.connected ? "Connected" : "Connect"}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
