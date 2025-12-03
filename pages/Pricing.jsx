// src/pages/Pricing.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Users, Building2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const plans = [
  {
    name: "Free Trial",
    price: "0",
    period: "60 Days",
    description: "Perfect to get started",
    icon: Sparkles,
    features: [
      "First contract free",
      "60 days full access",
      "AI analysis",
      "Calendar tracking",
      "Email reminders",
      "No credit card"
    ],
    tier: "trial",
    highlighted: false,
    ctaText: "Start Free Trial",
    stripeBuyButtonId: null
  },
  {
    name: "Budget",
    price: "9.99",
    period: "month",
    description: "For part-time agents",
    icon: Zap,
    features: [
      "2 contracts/month",
      "AI analysis",
      "Calendar tracking",
      "Email reminders",
      "Counter offers",
      "Mobile optimized"
    ],
    tier: "budget",
    highlighted: false,
    ctaText: "Get Started",
    stripeBuyButtonId: "buy_btn_1SGsHg0ONIDdV6FnDvFyVTX7"
  },
  {
    name: "Professional",
    price: "49",
    period: "month",
    description: "⭐ Most Popular - For full-time agents",
    icon: Building2,
    features: [
      "15 contracts/month",
      "AI analysis",
      "Calendar tracking",
      "Custom reminders",
      "Counter offers",
      "Priority support"
    ],
    tier: "professional",
    highlighted: true,
    ctaText: "Get Started",
    stripeBuyButtonId: "buy_btn_1SGPxr0ONIDdV6FnqhxWOEDx"
  },
  {
    name: "Team",
    price: "129",
    period: "month",
    description: "For brokerages & teams",
    icon: Users,
    features: [
      "Unlimited contracts",
      "Up to 10 agents",
      "Team dashboard",
      "Shared calendar",
      "Custom checklists",
      "Account manager"
    ],
    tier: "team",
    highlighted: false,
    ctaText: "Get Started",
    stripeBuyButtonId: "buy_btn_1SGPcF0ONIDdV6Fn6cHvfTbd"
  }
];

// TODO later: move this into env and use a Supabase function
const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SEbmu0ONIDdV6FnuhtBmtd5DMoWeofgPWVU7X4YgGncZ7xBCShjfuSqaqXVYqYC9pU8jm4zwYvSyd7i5LaChf4I004NcVCXom";

export default function PricingPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  useEffect(() => {
    loadUser();
    loadStripeScript();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setUserProfile(profile || null);
    } catch (error) {
      console.error("Error loading user/profile:", error);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStripeScript = () => {
    if (
      document.querySelector(
        'script[src="https://js.stripe.com/v3/buy-button.js"]'
      )
    ) {
      setStripeLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.async = true;
    script.onload = () => setStripeLoaded(true);
    script.onerror = () => console.error("Failed to load Stripe");
    document.body.appendChild(script);
  };

  const handleTrialStart = async () => {
    // For now, just send them to your login/start flow.
    // Later, you can call a Supabase function to mark trial started.
    window.location.href = createPageUrl("Dashboard");
  };

  const handleSignIn = () => {
    window.location.href = createPageUrl("Dashboard");
  };

  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
          [class*="base44"], [id*="base44"], button[title*="base44"], a[href*="base44"] {
            display: none !important;
          }
          stripe-buy-button {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }
          
          @media (max-width: 768px) {
            stripe-buy-button {
              max-width: 100% !important;
            }
          }
        `}
      </style>

      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link
              to={createPageUrl("Landing")}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                ContractFlowAI
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                onClick={handleSignIn}
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900 px-2 sm:px-4"
              >
                Sign In
              </Button>
              <Button
                onClick={handleTrialStart}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white text-sm sm:text-base px-3 sm:px-6"
              >
                Try Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-4 sm:mb-6">
            Simple Pricing
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12">
            Choose the plan that fits your business. All plans include AI-powered
            contract management.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mb-12 sm:mb-20">
          {plans.map((plan) => {
            const isCurrent =
              userProfile?.subscription_tier === plan.tier &&
              userProfile?.subscription_status === "active";

            return (
              <Card
                key={plan.name}
                className={`relative border-2 transition-all duration-300 ${
                  plan.highlighted
                    ? "border-[#1e3a5f] shadow-2xl lg:scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#1e3a5f] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pt-8 sm:pt-10 pb-6 sm:pb-8 px-4 sm:px-6">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? "bg-[#1e3a5f]" : "bg-gray-100"
                    }`}
                  >
                    <plan.icon
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        plan.highlighted ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>

                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                    {plan.description}
                  </p>

                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-sm sm:text-base text-gray-500">
                        /{plan.period}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    {plan.tier === "trial" ? (
                      <button
                        onClick={handleTrialStart}
                        disabled={isLoading || isCurrent}
                        className="w-full bg-black hover:bg-gray-800 text-white font-medium rounded-md py-2.5 px-4 sm:px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          fontSize: "14px",
                          lineHeight: "20px",
                          height: "40px",
                        }}
                      >
                        {isCurrent ? "Current Plan" : plan.ctaText}
                      </button>
                    ) : plan.stripeBuyButtonId && stripeLoaded ? (
                      <stripe-buy-button
                        buy-button-id={plan.stripeBuyButtonId}
                        publishable-key={STRIPE_PUBLISHABLE_KEY}
                      />
                    ) : (
                      <Button disabled className="w-full py-4 sm:py-6 text-sm sm:text-base">
                        Loading...
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
                  <div className="flex justify-center">
                    <div className="space-y-2 sm:space-y-3">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 sm:gap-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-700">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* (rest of the page – features, CTA, footer – unchanged from your version) */}
        {/* ... keep your existing JSX here ... */}
      </div>
    </div>
  );
}
