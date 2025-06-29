"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DownloadRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to pricing page immediately
    router.push('/pricing');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Redirecting...</h1>
        <p className="text-white/80">Taking you to the pricing page</p>
      </div>
    </div>
  );
} 