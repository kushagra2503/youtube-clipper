"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Star, Download, Clock } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import SignInModal from "@/components/sign-in";
import { useState, useEffect } from "react";
import Buy from "@/components/buy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const pricingPlans = [
  {
    name: "Download QuackQuery",
    price: "4.20",
    currency: "$",
    description: "",
    features: [
      "Get the app setup on your computer",
      "Unlimited interview sessions",
      "Advanced AI responses",
      "Real-time assistance",
      "Multiple interview types",
      "Priority support",
      "Custom AI training",
      "Export interview summaries"
    ],
    buttonText: "Start Quacking!",
    popular: true,
    product_id: "pdt_4oP8pxxo66BVMQoPG4JrP"
  },
  {
    name: "For Enterprise",
    price: "Flexible",
    currency: "$",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Team dashboard",
      "User management",
      "Custom integrations",
      "Advanced analytics",
      "Dedicated support",
      "On-premise deployment",
      "Custom AI models"
    ],
    buttonText: "Contact Sales",
    popular: false,
    product_id: "enterprise"
  }
];

export default function PricingPage() {
  const { data: session } = authClient.useSession();
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showMacComingSoon, setShowMacComingSoon] = useState(false);

  // Check user info and download permissions
  useEffect(() => {
    const checkUserInfo = async () => {
      if (session) {
        try {
          setLoadingUserInfo(true);
          const response = await fetch('/api/user/info');
          const data = await response.json();
          console.log('Pricing page - user info loaded:', data);
          setUserInfo(data);
        } catch (error) {
          console.error('Failed to check user info:', error);
        } finally {
          setLoadingUserInfo(false);
        }
      }
    };

    checkUserInfo();
  }, [session]);

  const handleDirectDownload = async () => {
    console.log('handleDirectDownload called', { userInfo });
    
    // Check if userInfo is loaded
    if (!userInfo) {
      console.log('User info not loaded yet');
      return;
    }
    
    // Open download modal for all users - behavior will be different based on permissions
    setDownloadModalOpen(true);
  };

  const handleWindowsDownload = async () => {
    // Check if user has download permissions
    if (!userInfo?.isSudo && !userInfo?.isAdmin && !userInfo?.lifetimeAccess) {
      // User doesn't have permissions, show purchase flow
      setDownloadModalOpen(false);
      setSelectedPlan(pricingPlans[0]); // Select the Pro plan
      setBuyModalOpen(true);
      return;
    }

    try {
      setDownloading(true);
      
      // Use appropriate endpoint based on user type
      if (userInfo?.isSudo || userInfo?.isAdmin) {
        window.location.href = '/api/download/github';
      } else {
        // Paid users use regular download endpoint
        window.location.href = '/api/download';
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
      setDownloadModalOpen(false);
    }
  };

  const handleMacClick = () => {
    // Check if user has download permissions
    if (!userInfo?.isSudo && !userInfo?.isAdmin && !userInfo?.lifetimeAccess) {
      // User doesn't have permissions, show purchase flow
      setDownloadModalOpen(false);
      setSelectedPlan(pricingPlans[0]); // Select the Pro plan
      setBuyModalOpen(true);
      return;
    }

    // User has permissions, show coming soon modal
    setShowMacComingSoon(true);
  };

  const handlePlanSelect = (plan: typeof pricingPlans[0]) => {
    if (plan.product_id === "enterprise") {
      // Handle enterprise contact
      window.open("mailto:radhikayash2@gmail..com?subject=Enterprise Plan Inquiry");
      return;
    }

    // If user can download (sudo, admin, or has lifetime access) and selecting the main plan
    if ((userInfo?.isSudo || userInfo?.isAdmin || userInfo?.lifetimeAccess) && plan.product_id === "pdt_4oP8pxxo66BVMQoPG4JrP") {
      handleDirectDownload();
      return;
    }

    // For all other users, show download modal first, then purchase flow
    if (plan.product_id === "pdt_4oP8pxxo66BVMQoPG4JrP") {
      setDownloadModalOpen(true);
      return;
    }

    setSelectedPlan(plan);
    setBuyModalOpen(true);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
        <motion.div
          className="text-center mb-16"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-4">
             Contribute to QuackQuery
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
           Contribute to get lifetime access to QuackQuery with a simple one-time payment. 
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? "border-purple-400/50 ring-2 ring-purple-400/20"
                  : "border-white/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Contribute to developer
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.name === "Pro" && <Crown className="w-5 h-5 text-yellow-400" />}
                  {plan.name === "Enterprise" && <Zap className="w-5 h-5 text-blue-400" />}
                  <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{plan.currency}{plan.price}</span>
                  {plan.price !== "0" && plan.price !== "Flexible" && <span className="text-white/60">one-time</span>}
                </div>
                <p className="text-white/70 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3 text-white/80 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {session ? (
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500"
                      : "bg-white/10 border border-white/20 hover:bg-white/20"
                  } text-white`}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loadingUserInfo || !userInfo} // Disable until userInfo loads
                >
                  {loadingUserInfo || !userInfo ? (
                    "Loading..."
                  ) : (userInfo?.isSudo || userInfo?.isAdmin || userInfo?.lifetimeAccess) && plan.product_id === "pdt_4oP8pxxo66BVMQoPG4JrP" ? (
                    userInfo?.isSudo || userInfo?.isAdmin
                      ? "Download Now (Sudo User)"
                      : "Download Now (Purchased)"
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              ) : (
                <SignInModal
                  trigger={
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500"
                          : "bg-white/10 border border-white/20 hover:bg-white/20"
                      } text-white`}
                    >
                      {plan.buttonText}
                    </Button>
                  }
                />
              )}
            </div>
          ))}
        </motion.div>




      </main>

      {/* Buy Modal */}
      {selectedPlan && (
        <Buy
          product={selectedPlan}
          isOpen={buyModalOpen}
          setIsOpen={setBuyModalOpen}
        />
      )}

      {/* Download Platform Selection Modal */}
      <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
        <DialogContent className="bg-white/10 backdrop-blur-lg border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-white text-xl">
              Choose Your Platform
            </DialogTitle>
            <DialogDescription className="text-center text-white/80">
              Select your operating system to download QuackQuery
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 mt-6">
            {/* Windows Download Option */}
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
                <div className="flex items-center gap-2 text-sm">
                  {downloading ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin text-blue-400" />
                      <span className="text-blue-400">Downloading...</span>
                    </>
                  ) : userInfo?.isSudo || userInfo?.isAdmin || userInfo?.lifetimeAccess ? (
                    <>
                      <Download className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Download Now</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">Purchase & Download</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Mac Coming Soon Option */}
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 cursor-pointer hover:bg-white/10 transition-all duration-300"
              onClick={handleMacClick}
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
                <div className="flex items-center gap-2 text-sm">
                  {userInfo?.isSudo || userInfo?.isAdmin || userInfo?.lifetimeAccess ? (
                    <>
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400">Coming Soon</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">Purchase & Get Early Access</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mac Coming Soon Details Modal */}
      <Dialog open={showMacComingSoon} onOpenChange={setShowMacComingSoon}>
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
              onClick={() => setShowMacComingSoon(false)}
              className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white"
            >
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 