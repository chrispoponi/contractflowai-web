import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/api/entities";
import { Contract } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, TrendingUp, CreditCard, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays } from "date-fns";

export default function SubscriptionGate({ 
  children, 
  requiredTier = "professional",
  featureName = "this feature"
}) {
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const checkAccess = useCallback(async () => {
    try {
      const userData = await User.me();
      
      // Auto-set trial_start_date if not set
      if (!userData.trial_start_date && userData.subscription_tier === 'trial') {
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 60);
        
        await User.updateMyUserData({
          trial_start_date: today,
          trial_end_date: endDate.toISOString().split('T')[0]
        });
        
        userData.trial_start_date = today;
        userData.trial_end_date = endDate.toISOString().split('T')[0];
      }
      
      setUser(userData);

      const userContracts = await Contract.list();
      setContracts(userContracts);

      const tier = userData.subscription_tier || 'trial';
      const status = userData.subscription_status || 'active';

      // TRIAL LOGIC: 60 days OR 1 closed contract
      if (tier === 'trial') {
        // Check if any contract has been closed
        const hasClosedContract = userContracts.some(c => c.closing_completed || c.status === 'closed');
        
        // Check if 60 days have passed
        const trialStart = userData.trial_start_date ? new Date(userData.trial_start_date) : new Date();
        const today = new Date();
        const daysElapsed = differenceInDays(today, trialStart);
        const daysLeft = 60 - daysElapsed;
        setTrialDaysLeft(Math.max(0, daysLeft));
        
        // Block if EITHER condition is met
        if (hasClosedContract) {
          setHasAccess(false);
          setBlockReason("trial_contract_closed");
          setIsLoading(false);
          return;
        }
        
        if (daysElapsed >= 60) {
          setHasAccess(false);
          setBlockReason("trial_time_expired");
          setIsLoading(false);
          return;
        }
        
        // Still in trial - full access
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // PAID USERS: Check if subscription is active
      if (status !== 'active') {
        setHasAccess(false);
        setBlockReason("subscription_inactive");
        setIsLoading(false);
        return;
      }

      // Check tier access for paid users
      const tierHierarchy = { trial: 0, professional: 1, team: 2 };
      const userTierLevel = tierHierarchy[tier] || 0;
      const requiredTierLevel = tierHierarchy[requiredTier] || 0;

      setHasAccess(userTierLevel >= requiredTierLevel);
    } catch (error) {
      console.error("SubscriptionGate error:", error);
      setHasAccess(false);
      setBlockReason("error");
    }
    setIsLoading(false);
  }, [requiredTier, featureName]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  if (!hasAccess) {
    const closedContract = contracts.find(c => c.closing_completed || c.status === 'closed');

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-full flex items-center justify-center">
              {blockReason === "subscription_inactive" ? (
                <CreditCard className="w-10 h-10 text-white" />
              ) : blockReason === "trial_contract_closed" ? (
                <Sparkles className="w-10 h-10 text-white" />
              ) : blockReason === "trial_time_expired" ? (
                <Calendar className="w-10 h-10 text-white" />
              ) : (
                <Lock className="w-10 h-10 text-white" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              {blockReason === "subscription_inactive" && "⚠️ Subscription Expired"}
              {blockReason === "trial_contract_closed" && "🎉 You Closed Your First Deal!"}
              {blockReason === "trial_time_expired" && "⏰ 60-Day Trial Ended"}
              {blockReason === "error" && `Upgrade to Access ${featureName}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6 p-8">
            {blockReason === "subscription_inactive" && (
              <>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                  <CreditCard className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Your Subscription Has Expired</h3>
                  <p className="text-gray-700">
                    Renew now to continue managing your contracts and never miss an important date!
                  </p>
                </div>
                <p className="text-lg text-gray-700">
                  <strong>All your contracts and data are safe.</strong><br />
                  Simply reactivate your subscription to regain full access.
                </p>
              </>
            )}

            {blockReason === "trial_contract_closed" && (
              <>
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Congratulations on Closing Your First Deal!</h3>
                  <p className="text-gray-700">
                    You successfully completed your trial contract with ContractFlowAI!
                  </p>
                  {closedContract && (
                    <p className="text-sm text-gray-600 mt-2">
                      📍 {closedContract.property_address}
                    </p>
                  )}
                </div>
                <p className="text-lg text-gray-700">
                  Ready to manage more contracts? Upgrade to <strong>Professional</strong> for unlimited deals at just <strong>$49/month</strong>.
                </p>
              </>
            )}

            {blockReason === "trial_time_expired" && (
              <>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Your 60-Day Trial Has Ended</h3>
                  <p className="text-gray-700">
                    You've had {contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'} during your trial period.
                  </p>
                </div>
                <p className="text-lg text-gray-700">
                  Continue managing your contracts with <strong>Professional</strong> for just <strong>$49/month</strong>.
                </p>
              </>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#1e3a5f]" />
                <h3 className="font-semibold text-lg text-gray-900">
                  Professional Plan - $49/month
                </h3>
              </div>
              <ul className="text-left space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Unlimited contracts</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>AI-powered contract analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Complete calendar & date tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Counter offer management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Priority support</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl("Pricing")}>
                <Button className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto">
                  Upgrade to Professional
                </Button>
              </Link>
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline" className="px-8 py-6 text-lg w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Questions? Contact us at <a href="mailto:support@contractflowai.com" className="text-[#1e3a5f] hover:underline">support@contractflowai.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}