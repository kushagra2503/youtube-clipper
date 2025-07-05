"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Loader2, Shield, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface AdminSetupStatus {
  hasAdmins: boolean;
  currentUserIsAdmin: boolean;
  currentUserEmail: string;
  canMakeFirstAdmin: boolean;
}

export default function AdminSetupPage() {
  const { data: session, isPending } = authClient.useSession();
  const [setupStatus, setSetupStatus] = useState<AdminSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const checkSetupStatus = async () => {
    try {
      setSetupLoading(true);
      const response = await fetch("/api/admin/setup");
      const data = await response.json();
      
      if (response.ok) {
        setSetupStatus(data);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to check setup status" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to check setup status" });
    } finally {
      setSetupLoading(false);
    }
  };

  const makeFirstAdmin = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        checkSetupStatus(); // Refresh status
      } else {
        setMessage({ type: "error", text: data.error || "Failed to set up admin" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to set up admin" });
    } finally {
      setLoading(false);
    }
  };

  const addSudoUser = async (email: string) => {
    try {
      const response = await fetch('/api/admin/sudo-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });
      
      if (response.ok) {
        alert(`Added ${email} as sudo user`);
      } else {
        const error = await response.json();
        alert(`Failed to add sudo user: ${error.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (session?.user) {
      checkSetupStatus();
    }
  }, [session]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (isPending || setupLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>You need to be logged in to set up admin access.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Setup
            </CardTitle>
            <CardDescription>
              Set up the first administrator for your YouTube Clipper instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                message.type === "success" 
                  ? "bg-green-100 text-green-700 border border-green-300" 
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}>
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {message.text}
              </div>
            )}

            {setupStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Current User</h3>
                    <p className="text-sm text-muted-foreground">{setupStatus.currentUserEmail}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Admin Status</h3>
                    <p className={`text-sm ${
                      setupStatus.currentUserIsAdmin ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {setupStatus.currentUserIsAdmin ? "Admin" : "Regular User"}
                    </p>
                  </div>
                </div>

                {setupStatus.currentUserIsAdmin ? (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 justify-center">
                      <CheckCircle className="w-5 h-5" />
                      You are already an administrator!
                    </div>
                    <Link href="/admin">
                      <Button>Go to Admin Panel</Button>
                    </Link>
                  </div>
                ) : setupStatus.canMakeFirstAdmin ? (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-blue-100 text-blue-700 rounded-lg">
                      <p className="font-medium">No administrators found</p>
                      <p className="text-sm mt-1">
                        Since no admin exists yet, you can set yourself as the first administrator.
                      </p>
                    </div>
                    <Button 
                      onClick={makeFirstAdmin} 
                      disabled={loading}
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Setting up...
                        </>
                      ) : (
                        "Make Me Admin"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
                      <p className="font-medium">Admin already exists</p>
                      <p className="text-sm mt-1">
                        An administrator has already been set up for this system. 
                        Contact them to request admin access.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Administrators can manage sudo users who get free premium access</p>
            <p>• Only one admin can be set up through this initial setup process</p>
            <p>• Additional admins must be set up manually in the database</p>
            <p>• Admin access is required to view and manage the sudo users list</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 