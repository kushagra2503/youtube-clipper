"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";

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
  const [showMacModal, setShowMacModal] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        if (!session) {
          console.log('No session found, redirecting to pricing');
          router.push('/pricing');
          return;
        }

        console.log('Fetching user info...');
        const response = await fetch('/api/user/info');
        
        if (!response.ok) {
          console.error('API response not ok:', response.status, response.statusText);
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('User info received:', data);
        setUserInfo(data);

        // If user cannot download, show error instead of redirecting to prevent loops
        if (!data.canDownload) {
          console.log('User cannot download, showing error instead of redirecting');
          setError('You do not have permission to download QuackQuery. Please purchase a license first.');
          return;
        }

        console.log('User can download, showing download options');

      } catch (error) {
        console.error('Error checking user status:', error);
        setError(error instanceof Error ? error.message : 'Failed to check download permissions');
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [session, router]);

  const handleWindowsDownload = async () => {
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
                  <div className="text-white/60 text-sm mb-1">Access Type</div>
                  <div className="text-white font-semibold">
                    {userInfo.isSudo ? "Sudo User" : "Lifetime Access"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">Version</div>
                  <div className="text-white font-semibold">1.0.0</div>
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-6">Choose your platform:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Windows Download Card */}
                <motion.div
                  className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 cursor-pointer hover:bg-white/10 transition-all duration-300 ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={downloading ? undefined : handleWindowsDownload}
                  whileHover={downloading ? {} : { scale: 1.02 }}
                  whileTap={downloading ? {} : { scale: 0.98 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 mb-4 flex items-center justify-center">
                      <Image
                        src="/assets/windows.png"
                        alt="Windows"
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-2">Windows</h4>
                    <p className="text-white/60 text-sm mb-4">Windows 10, 11 (64-bit)</p>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      {downloading ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download Now
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Mac Coming Soon Card */}
                <Dialog open={showMacModal} onOpenChange={setShowMacModal}>
                  <DialogTrigger asChild>
                    <motion.div
                      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 cursor-pointer hover:bg-white/10 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 mb-4 flex items-center justify-center">
                          <Image
                            src="/assets/mac.png"
                            alt="macOS"
                            width={64}
                            height={64}
                            className="object-contain"
                          />
                        </div>
                        <h4 className="text-white font-semibold text-lg mb-2">macOS</h4>
                        <p className="text-white/60 text-sm mb-4">macOS 11+ (Intel & Apple Silicon)</p>
                        <div className="flex items-center gap-2 text-orange-400 text-sm">
                          <Clock className="w-4 h-4" />
                          Coming Soon
                        </div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  
                  <DialogContent className="bg-white/10 backdrop-blur-lg border-white/20">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <Image
                          src="/assets/mac.png"
                          alt="macOS"
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                        macOS Version Coming Soon
                      </DialogTitle>
                      <DialogDescription className="text-white/80">
                        We&apos;re working hard to bring QuackQuery to macOS! Our team is currently developing the Mac version with all the features you love.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-medium mb-2">What to expect:</h4>
                        <ul className="text-white/70 text-sm space-y-1">
                          <li>• Native macOS experience with Apple Silicon optimization</li>
                          <li>• Full screen and microphone access support</li>
                          <li>• Same powerful AI features as Windows version</li>
                          <li>• Seamless integration with macOS accessibility features</li>
                        </ul>
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
                        <p className="text-blue-300 text-sm">
                          <strong>Good news!</strong> Your license includes macOS access. Once released, you&apos;ll be able to download it immediately with your current account.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={() => setShowMacModal(false)}
                        className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white"
                      >
                        Got it, thanks!
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4 text-left">
              <h3 className="text-blue-300 font-medium mb-2">Windows Installation Instructions:</h3>
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