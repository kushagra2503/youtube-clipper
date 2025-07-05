"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface UserInfo {
  canDownload: boolean;
  plan: string;
  downloadToken?: string;
  requiresPayment: boolean;
  lifetimeAccess: boolean;
  purchaseDate?: Date;
  isSudo: boolean;
  isAdmin: boolean;
}

export default function DownloadPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        if (!session) {
          // Not logged in, redirect to pricing
          router.push('/pricing');
          return;
        }

        const response = await fetch('/api/user/info');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch user info');
        }

        setUserInfo(data);

        // If user cannot download, redirect to pricing
        if (!data.canDownload) {
          router.push('/pricing');
          return;
        }

      } catch (error) {
        console.error('Error checking user status:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [session, router]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);

      if (userInfo?.isSudo || userInfo?.isAdmin) {
        // Sudo/admin users get direct GitHub download
        window.location.href = '/api/download/github';
      } else {
        // Paying users get file streamed from GitHub API
        window.location.href = '/api/download';
      }
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
        <div className="text-center">
          <Clock className="w-8 h-8 text-white mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-4">Checking access...</h1>
          <p className="text-white/80">Please wait while we verify your download permissions</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 pt-20">
          <motion.div
            className="text-center max-w-md mx-auto px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Download Error</h1>
            <p className="text-white/80 mb-6">{error}</p>
            <Button
              onClick={() => router.push('/pricing')}
              className="bg-white/10 border border-white/20 hover:bg-white/20 text-white"
            >
              Go to Pricing
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 pt-32 pb-12">
        <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-4">
              Ready to Download
            </h1>
            <p className="text-white/80 text-lg mb-8">
              {userInfo.isSudo 
                ? "As a sudo user, you have free access to QuackQuery."
                : "Thank you for your purchase! You now have lifetime access to QuackQuery."}
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">Platform</div>
                  <div className="text-white font-semibold">Windows</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">Version</div>
                  <div className="text-white font-semibold">1.0.0</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">Access Type</div>
                  <div className="text-white font-semibold">
                    {userInfo.isSudo ? "Sudo User" : "Lifetime Access"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">File Size</div>
                  <div className="text-white font-semibold">~50 MB</div>
                </div>
              </div>

              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white text-lg py-6"
              >
                {downloading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download QuackQuery for Windows
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4 text-left">
              <h3 className="text-blue-300 font-medium mb-2">Installation Instructions:</h3>
              <ol className="text-blue-200/80 text-sm space-y-1">
                <li>1. Download will start automatically</li>
                <li>2. Run the installer (QuackQuerySetup.exe)</li>
                <li>3. Follow the installation prompts</li>
                <li>4. Launch QuackQuery from your desktop or start menu</li>
                <li>5. Grant necessary permissions for screen and microphone access</li>
              </ol>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
} 