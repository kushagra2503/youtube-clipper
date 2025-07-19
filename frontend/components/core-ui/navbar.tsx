"use client";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import SignInModal from "@/components/sign-in";
import { User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isClient, setIsClient] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/user/premium");
          if (response.ok) {
            const data = await response.json();
            setIsPremiumUser(data.isPremium || data.isSudoUser);
          }
        } catch (error) {
          console.error("Failed to check premium status:", error);
        }
      } else {
        setIsPremiumUser(false);
      }
    };

    checkPremiumStatus();
  }, [session]);

  const handleLogout = async () => {
    try {
      // Call our backend session sync endpoint
      const response = await fetch(
        "http://localhost:3001/api/auth/sync-session",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: session?.user?.email,
            name: session?.user?.name,
            action: "logout",
          }),
        },
      );

      if (response.ok) {
        console.log("Backend logout sync successful");
      } else {
        console.warn("Backend logout sync failed:", await response.text());
      }
    } catch (error) {
      console.warn("Backend logout sync error:", error);
    }

    // Then call Better Auth signOut
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="flex items-center gap-8 mx-auto max-w-6xl w-full justify-between bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/assets/duck.png"
            alt="QuackQuery Logo"
            width={56}
            height={56}
            className="rounded-lg object-contain"
          />
          <h1 className="text-xl font-bold tracking-tight text-white">
            QuackQuery
          </h1>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Home
          </Link>
          <Link
            href="/docs"
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Docs
          </Link>
          {isPremiumUser && (
            <Link
              href="/integration"
              className="text-white/80 hover:text-white transition-colors font-medium"
            >
              Integration
            </Link>
          )}
          <Link
            href="/pricing"
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Contribute
          </Link>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isClient && session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 p-0"
                >
                  {session.user.image ? (
                    <Image
                      width={40}
                      height={40}
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white/10 backdrop-blur-md border border-white/20"
              >
                <div className="px-2 py-1.5 text-sm text-white">
                  <div className="font-medium">{session.user.name}</div>
                  <div className="text-white/70">{session.user.email}</div>
                </div>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isClient ? (
            <SignInModal
              trigger={
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  Sign In
                </Button>
              }
            />
          ) : (
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
