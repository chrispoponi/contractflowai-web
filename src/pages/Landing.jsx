
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, Bell, FileText, Users, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Check if user is already authenticated
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) {
        navigate(createPageUrl("Dashboard"));
      } else {
        // Check for referral code in URL (support both 'ref' and 'code' parameters)
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('code') || urlParams.get('ref');
        
        if (refCode) {
          // Store ref code in sessionStorage to use after login
          sessionStorage.setItem('pending_ref_code', refCode);
        }
        
        base44.auth.redirectToLogin(createPageUrl("Landing"));
      }
    });
  };

  const handleSignIn = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen">
      <style>
        {`
          /* Hide Base44 developer widget */
          [class*="base44-widget"],
          [class*="base44-editor"],
          [id*="base44-widget"],
          [id*="base44-editor"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}
      </style>

      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">ContractFlowAI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Pricing")}>
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Button variant="outline" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white"
              >
                Try It Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Never Miss a Real Estate
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] to-[#2563eb]">
                Deadline Again
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              AI-powered transaction management that keeps you on track. Upload contracts, get automatic reminders, and close deals faster.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white px-8 py-6 text-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to={createPageUrl("Pricing")}>
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              60-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Stay On Track
            </h2>
            <p className="text-xl text-gray-600">
              Built specifically for real estate agents who hate missing deadlines
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-[#1e3a5f] transition-all duration-300 hover:shadow-xl">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI Contract Upload</h3>
                <p className="text-gray-600 mb-4">
                  Upload any contract PDF and our AI automatically extracts all dates, parties, and terms in seconds.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Inspection, appraisal, closing dates</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Buyer/seller contact info</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Counter offer tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#1e3a5f] transition-all duration-300 hover:shadow-xl">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Reminders</h3>
                <p className="text-gray-600 mb-4">
                  Never miss a deadline with automated email reminders customized to your preferences.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>7, 3, 1 day alerts (customizable)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Overdue date warnings</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Skip completed milestones</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#1e3a5f] transition-all duration-300 hover:shadow-xl">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Visual Calendar</h3>
                <p className="text-gray-600 mb-4">
                  See all your transactions at a glance. Color-coded by milestone type, sorted by urgency.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>All contracts in one view</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Export to Google/Apple Calendar</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Bulk email client timelines</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
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
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Stop Missing Deadlines?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start your 60-day free trial. No credit card required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white px-8 py-6 text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link to={createPageUrl("Pricing")}>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">ContractFlowAI</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link to={createPageUrl("Privacy")} className="hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link to={createPageUrl("Pricing")} className="hover:text-gray-900">
                Pricing
              </Link>
              <button onClick={handleSignIn} className="hover:text-gray-900">
                Sign In
              </button>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            © 2025 ContractFlowAI. All rights reserved. Built for real estate professionals.
          </div>
        </div>
      </footer>
    </div>
  );
}
