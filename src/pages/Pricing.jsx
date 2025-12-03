import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Users, Building2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCurrentProfile, redirectToLogin } from "@/api/services";

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

const STRIPE_PUBLISHABLE_KEY = "pk_live_51SEbmu0ONIDdV6FnuhtBmtd5DMoWeofgPWVU7X4YgGncZ7xBCShjfuSqaqXVYqYC9pU8jm4zwYvSyd7i5LaChf4I004NcVCXom";

export default function PricingPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(true);

  useEffect(() => {
    loadUser();
    loadStripeScript();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getCurrentProfile();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
    setIsLoading(false);
  };

  const loadStripeScript = () => {
    if (document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]')) {
      setStripeLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    script.onload = () => setStripeLoaded(true);
    script.onerror = () => console.error('Failed to load Stripe');
    document.body.appendChild(script);
  };

  const handleTrialStart = () => {
    redirectToLogin(createPageUrl("Dashboard"));
  };

  const handleSignIn = () => {
    redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
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
            <Link to={createPageUrl("Landing")} className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">ContractFlowAI</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" onClick={handleSignIn} className="text-sm sm:text-base text-gray-600 hover:text-gray-900 px-2 sm:px-4">
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
            Choose the plan that fits your business. All plans include AI-powered contract management.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mb-12 sm:mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-2 transition-all duration-300 ${
                plan.highlighted 
                  ? 'border-[#1e3a5f] shadow-2xl lg:scale-105' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
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
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-lg flex items-center justify-center ${
                  plan.highlighted ? 'bg-[#1e3a5f]' : 'bg-gray-100'
                }`}>
                  <plan.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${plan.highlighted ? 'text-white' : 'text-gray-600'}`} />
                </div>
                
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">{plan.description}</p>
                
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-sm sm:text-base text-gray-500">/{plan.period}</span>
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  {plan.tier === 'trial' ? (
                    <button
                      onClick={handleTrialStart}
                      disabled={isLoading || (user?.subscription_tier === plan.tier && user?.subscription_status === 'active')}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium rounded-md py-2.5 px-4 sm:px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        fontSize: '14px',
                        lineHeight: '20px',
                        height: '40px'
                      }}
                    >
                      {user?.subscription_tier === plan.tier && user?.subscription_status === 'active' 
                        ? 'Current Plan' 
                        : plan.ctaText}
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
                        <span className="text-xs sm:text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto mb-12 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
            Everything you need to stay on track
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Automatically extract contract details in seconds with advanced AI technology.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Check className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">Never Miss Dates</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Smart reminders for every deadline, customized to your workflow.
              </p>
            </div>
            <div className="text-center sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">Built for Agents</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Designed by a licensed agent who understands your daily challenges.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to get started?
          </h2>
          <p className="text-blue-100 text-base sm:text-lg mb-6 sm:mb-8">
            Start your free 60-day trial today. No credit card required. Try your first contract free!
          </p>
          <Button 
            onClick={handleTrialStart}
            size="lg"
            className="bg-white text-[#1e3a5f] hover:bg-gray-100 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold"
          >
            Start 60-Day Free Trial
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-blue-100">
              <div className="mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#c9a961] to-[#b8935a] rounded-full mx-auto flex items-center justify-center">
                  <span className="text-white font-bold text-lg sm:text-2xl">JP</span>
                </div>
              </div>
              <p className="text-base sm:text-lg text-gray-700 italic mb-4 sm:mb-6 leading-relaxed">
                "As a licensed agent, I've used countless tools to manage my transactions. ContractFlowAI is the only one that actually keeps me organized without the headache. No more missed deadlines, no more scattered notes. Everything I need in one place."
              </p>
              <div className="border-t border-gray-200 pt-4">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Jackie Poponi</p>
                <p className="text-xs sm:text-sm text-gray-600">Licensed Real Estate Agent</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">ContractFlowAI</span>
            </div>
            <div className="flex gap-6 sm:gap-8 text-xs sm:text-sm text-gray-600">
              <Link to={createPageUrl("Privacy")} className="hover:text-gray-900">
                Privacy
              </Link>
              <Link to={createPageUrl("Landing")} className="hover:text-gray-900">
                Home
              </Link>
              <button onClick={handleSignIn} className="hover:text-gray-900">
                Sign In
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              © 2025 ContractFlowAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}