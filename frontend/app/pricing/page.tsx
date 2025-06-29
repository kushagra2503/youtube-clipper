"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Star } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import SignInModal from "@/components/sign-in";
import { useState, useEffect } from "react";
import Buy from "@/components/buy";

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
    price: "5.20",
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
    product_id: "pro_monthly"
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

  // Check user info and download permissions
  useEffect(() => {
    const checkUserInfo = async () => {
      if (session) {
        try {
          const response = await fetch('/api/user/info');
          const data = await response.json();
          setUserInfo(data);
        } catch (error) {
          console.error('Failed to check user info:', error);
        }
      }
    };

    checkUserInfo();
  }, [session]);

  const handleDirectDownload = async () => {
    if (!userInfo?.isSudo) return;
    
    // Default to Windows, but you can add platform detection or selection
    try {
      const response = await fetch('/api/download/github?platform=windows');
      const data = await response.json();
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get download URL:', error);
    }
  };

  const handlePlanSelect = (plan: typeof pricingPlans[0]) => {
    if (plan.product_id === "enterprise") {
      // Handle enterprise contact
      window.open("mailto:radhikayash2@gmail..com?subject=Enterprise Plan Inquiry");
      return;
    }

    // If user is sudo/admin and selecting the main plan, give direct download
    if (userInfo?.isSudo && plan.product_id === "pro_monthly") {
      handleDirectDownload();
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
            Get Started With QuackQuery
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Get lifetime access to QuackQuery with a simple one-time payment.
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
                    Most Popular
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
                >
                  {userInfo?.isSudo && plan.product_id === "pro_monthly" 
                    ? "Download Now (Free for Sudo)" 
                    : plan.buttonText}
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
    </>
  );
} 