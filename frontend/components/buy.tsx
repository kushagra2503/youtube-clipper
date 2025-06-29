"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { PurchaseForm } from './subscription-form';

type Product = {
  product_id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
};

interface CollectedBillingData {
  billing: {
    city: string;
    state: string;
    street: string;
    zipcode: string;
    country: string;
  };
  customer: {
    name: string;
  };
}

export default function Buy({
  product,
  isOpen,
  setIsOpen,
}: {
  product: Product;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const router = useRouter();


  const handleShowBillingForm = () => {
    setShowBillingForm(true);
  };

  const processPurchase = async (collectedData: CollectedBillingData) => {
    if (!product) {
      console.error("Product information is missing.");
      return;
    }
    setLoading(true);
    try {
      const purchaseData = {
        billing: collectedData.billing,
        customer: {
          name: collectedData.customer.name,
        },
        product_id: product.product_id,
        quantity: 1,
        payment_link: true,
      };

      const response = await fetch(`/api/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      });

      const data = await response.json();

      if (data.payment_link) {
        router.push(data.payment_link.url || data.payment_link);
      } else {
        const checkoutUrl = `https://test.checkout.dodopayments.com/buy/${product.product_id}?quantity=1&redirect_url=${process.env.NEXT_PUBLIC_BASE_URL}`;
        router.push(checkoutUrl);
      }
    } catch (error) {
      console.error("Purchase processing error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full space-y-4 rounded-3xl">
        <DialogTitle className="text-4xl font-bold mb-0">
          {product.currency}
          {product.price}
          {" "}
          one-time payment
        </DialogTitle>
        {!showBillingForm && (
          <>
            <DialogDescription className="text-lg mb-4">
              {product.description}
            </DialogDescription>
            <ul className="flex flex-col gap-2 mb-4">
              <li className="flex items-center gap-2">
                <span>🧠</span>
                Advanced AI assistance for all interview types
              </li>
              <li className="flex items-center gap-2">
                <span>🚀</span>
                Unlimited interview sessions with real-time help
              </li>
              <li className="flex items-center gap-2">
                <span>🔒</span>
                Complete privacy - all processing happens locally
              </li>
              <li className="flex items-center gap-2">
                <span>💡</span>
                Get coding solutions, behavioral answers, and system design help
              </li>
              <li className="flex items-center gap-2">
                <span>❤️</span>
                Lifetime access with your one-time purchase
              </li>
            </ul>
          </>
        )}
        {showBillingForm ? (
          <>
                          <PurchaseForm onSubmit={processPurchase} />
            {loading && <p className="text-center mt-2">Processing your purchase...</p>}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBillingForm(false);
                  setLoading(false);
                }}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </>
        ) : (
          <>
          <div className="flex gap-2 mt-6">
            <Button
              size="lg"
              onClick={handleShowBillingForm}
              disabled={loading}
              className="w-fit"
            >
              Proceed to Billing
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="w-fit"
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
          By purchasing, you agree to our{" "}
          <a href="/terms" className="underline">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          . One-time payment, lifetime access.
        </p>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
