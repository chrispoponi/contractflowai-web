
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard } from "lucide-react";

import StatsOverview from "../components/dashboard/StatsOverview";
import ContractsList from "../components/dashboard/ContractsList";
import UpcomingDates from "../components/dashboard/UpcomingDates";
import { getCurrentProfile, redirectToLogin, updateCurrentProfile } from "@/lib/supabaseAuth";
import { supabaseEntities } from "@/lib/supabaseEntities";
import { invokeFunction } from "@/lib/supabaseFunctions";

export default function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);
  const [trialInfo, setTrialInfo] = useState(null);
  const [contractLimitInfo, setContractLimitInfo] = useState(null);
  const [showUpgradeCountdown, setShowUpgradeCountdown] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const cachedUser = sessionStorage.getItem('user_data');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
      
      const userData = await getCurrentProfile();
      if (!userData) {
        redirectToLogin(window.location.pathname);
        sessionStorage.removeItem('user_data');
        return;
      }
      
      setUser(userData);
      sessionStorage.setItem('user_data', JSON.stringify(userData));

      // Check for pending referral code (support both 'code' and 'ref_code')
      const pendingRefCode = sessionStorage.getItem('pending_ref_code');
      if (pendingRefCode) {
        try {
          await invokeFunction('processReferral', { code: pendingRefCode });
          console.log("✅ Referral processed");
          sessionStorage.removeItem('pending_ref_code');
        } catch (refError) {
          console.error("⚠️ Referral processing error:", refError);
        }
      }
      
      loadData(userData);
    } catch (error) {
      console.error("Auth error:", error);
      sessionStorage.removeItem('user_data');
      redirectToLogin(window.location.pathname);
    }
  };

  const calculateContractLimitInfo = useCallback((userData, allContracts, currentTrialInfo, currentShowExpiredWarning) => {
    const isTrial = userData.subscription_tier === 'trial';
    let limit = -1;
    let tierName = "Unknown";

    if (isTrial) {
      limit = 1;
      tierName = "Trial";
    } else {
      switch (userData.subscription_tier) {
        case 'beta':
          limit = -1; // Unlimited for beta testers (professional level)
          tierName = "Beta";
          break;
        case 'team_beta': // New team_beta tier
          limit = -1; // Unlimited for team beta testers
          tierName = "Team Beta";
          break;
        case 'budget':
          limit = 2;
          tierName = "Budget";
          break;
        case 'professional':
          limit = 15;
          tierName = "Professional";
          break;
        case 'team':
          limit = -1;
          tierName = "Team";
          break;
        default:
          limit = 0;
          tierName = "Base";
      }
    }

    const used = allContracts.length;
    const remaining = limit === -1 ? "Unlimited" : Math.max(0, limit - used);
    const isLimitReached = limit !== -1 && used >= limit;
    
    const showLimitWarning = !isTrial && isLimitReached && !currentShowExpiredWarning;

    let canUserUpload = true;
    if (isTrial) {
        canUserUpload = currentTrialInfo?.isActive || false;
    } else if (userData.subscription_tier === 'beta' || userData.subscription_tier === 'team_beta') { // Include team_beta
        canUserUpload = true; // Beta users can always upload
    } else {
        canUserUpload = !isLimitReached;
    }

    return {
      limit,
      used,
      remaining,
      isLimitReached,
      tierName,
      isTrial,
      showLimitWarning,
      canUpload: canUserUpload
    };
  }, []);

  const loadData = async (currentUserData = null) => {
    setIsLoading(true);
    try {
      let userData = currentUserData;
      if (!userData) {
          console.warn("loadData called without user data, fetching it again.");
          userData = await getCurrentProfile();
          if (!userData) {
              console.error("No user data available for loadData, redirecting.");
              redirectToLogin(window.location.pathname);
              setIsLoading(false);
              return;
          }
      }
      
      // Auto-upgrade beta testers
      const betaTesters = ['chrispoponi@gmail.com', 'jackiepoponi@gmail.com'];
      if (betaTesters.includes(userData.email)) {
        if (userData.subscription_status !== 'active' || userData.subscription_tier !== 'professional' || userData.organization_role !== 'admin') {
          console.log(`Auto-upgrading ${userData.email} to professional active subscription.`);
          userData = await updateCurrentProfile({
            subscription_tier: 'professional',
            subscription_status: 'active',
            organization_role: userData.email === 'chrispoponi@gmail.com' ? 'admin' : 'team_lead'
          });
        }
      }
      
      // Auto-set trial dates if not set for trial users - 60 DAYS
      if (!userData.trial_start_date && userData.subscription_tier === 'trial') {
        const today = new Date();
        const trialStartDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 60);
        const trialEndDate = endDate.toISOString().split('T')[0];
        
        userData = await updateCurrentProfile({
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
          contracts_used_this_month: 0,
          monthly_reset_date: today.toISOString().split('T')[0]
        });
      }

      const today = new Date();
      const lastResetDate = userData.monthly_reset_date
        ? new Date(userData.monthly_reset_date)
        : null;

      if (
        lastResetDate &&
        (lastResetDate.getMonth() !== today.getMonth() ||
          lastResetDate.getFullYear() !== today.getFullYear())
      ) {
        userData = await updateCurrentProfile({
          contracts_used_this_month: 0,
          monthly_reset_date: today.toISOString().split("T")[0],
        });
      }

      sessionStorage.setItem("user_data", JSON.stringify(userData));
      
      // Fetch contracts
      let allContracts = [];
      try {
        allContracts = await supabaseEntities.Contract.list("-created_date");
        console.log("✅ Contracts loaded:", allContracts.length);
      } catch (contractError) {
        console.error("❌ Error loading contracts:", contractError);
        allContracts = [];
      }

      // Calculate trial info
      let localTrialInfo = null;
      let localShowExpiredWarning = false;
      let localShowUpgradeCountdown = false;

      if (userData.subscription_tier === 'trial' && userData.trial_start_date) {
        const trialStart = new Date(userData.trial_start_date);
        const today = new Date();
        const daysElapsed = Math.floor((today - trialStart) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 60 - daysElapsed);
        
        const hasUploadedContract = allContracts.length >= 1;
        
        localTrialInfo = {
          daysLeft,
          daysElapsed,
          isActive: daysLeft > 0 && !hasUploadedContract
        };
        setTrialInfo(localTrialInfo);
        
        if (daysLeft <= 10 && daysLeft > 0 && !hasUploadedContract) {
          localShowUpgradeCountdown = true;
        }

        if (daysElapsed >= 60 || hasUploadedContract) {
          localShowExpiredWarning = true;
        }
      } else if (userData.subscription_tier === 'budget' && userData.subscription_status === 'active') {
        const today = new Date();
        const resetDayOfMonth = new Date(userData.monthly_reset_date).getDate(); 
        let nextResetDate = new Date(today.getFullYear(), today.getMonth(), resetDayOfMonth); 
        if (nextResetDate < today) {
            nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        }
        const daysUntilReset = Math.ceil((nextResetDate - today) / (1000 * 60 * 60 * 24)); 
        
        if (daysUntilReset <= 10 && daysUntilReset > 0) {
          localShowUpgradeCountdown = true;
        }
      } else if (userData.subscription_tier !== 'trial' && userData.subscription_status !== 'active') {
        localShowExpiredWarning = true;
      }
      setShowExpiredWarning(localShowExpiredWarning);
      setShowUpgradeCountdown(localShowUpgradeCountdown);

      setContracts(allContracts);

      const limits = calculateContractLimitInfo(userData, allContracts, localTrialInfo, localShowExpiredWarning);
      setContractLimitInfo(limits);
      
    } catch (error) {
      console.error("Error loading data:", error);
      redirectToLogin(window.location.pathname);
    }
    setIsLoading(false);
  };

  const hasDates = useCallback((contract) => {
    return !!(
      contract.closing_date ||
      contract.inspection_date ||
      contract.inspection_response_date ||
      contract.loan_contingency_date ||
      contract.appraisal_date ||
      contract.final_walkthrough_date
    );
  }, []);

  const getActiveContracts = useCallback(() => {
    const contractGroups = {};
    
    contracts.forEach(contract => {
      if (contract.is_counter_offer && contract.original_contract_id) {
        if (!contractGroups[contract.original_contract_id]) {
          contractGroups[contract.original_contract_id] = [];
        }
        contractGroups[contract.original_contract_id].push(contract);
      } else if (!contract.is_counter_offer) {
        if (!contractGroups[contract.id]) {
          contractGroups[contract.id] = [];
        }
        contractGroups[contract.id].push(contract);
      }
    });

    const activeContracts = [];
    Object.keys(contractGroups).forEach(groupId => {
      const group = contractGroups[groupId];
      
      const signedCounterOffer = group
        .filter(c => c.is_counter_offer && c.all_parties_signed)
        .sort((a, b) => (b.counter_offer_number || 0) - (a.counter_offer_number || 0))[0];
      
      const original = group.find(c => !c.is_counter_offer);
      
      if (signedCounterOffer) {
        if (!hasDates(signedCounterOffer) && original) {
          activeContracts.push({
            ...signedCounterOffer,
            closing_date: original.closing_date,
            inspection_date: original.inspection_date,
            inspection_response_date: original.inspection_response_date,
            loan_contingency_date: original.loan_contingency_date,
            appraisal_date: original.appraisal_date,
            final_walkthrough_date: original.final_walkthrough_date,
            _using_original_dates: true
          });
        } else {
          activeContracts.push(signedCounterOffer);
        }
      } else if (original) {
        activeContracts.push(original);
      }
    });

    return activeContracts.filter(c => !["cancelled", "superseded"].includes(c.status));
  }, [contracts, hasDates]);

  const getUpcomingDates = useCallback(() => {
    const dates = [];
    const allActiveContracts = getActiveContracts();
    const contractsWithUpcomingDates = allActiveContracts.filter(c => 
      !c.closing_completed && !["cancelled", "superseded"].includes(c.status)
    );
    
    contractsWithUpcomingDates.forEach(contract => {
      if (contract.inspection_date) {
        dates.push({
          date: contract.inspection_date,
          type: "Inspection",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.inspection_completed
        });
      }
      if (contract.inspection_response_date) {
        dates.push({
          date: contract.inspection_response_date,
          type: "Inspection Response",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.inspection_response_completed
        });
      }
      if (contract.loan_contingency_date) {
        dates.push({
          date: contract.loan_contingency_date,
          type: "Loan Contingency",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.loan_contingency_completed
        });
      }
      if (contract.appraisal_date) {
        dates.push({
          date: contract.appraisal_date,
          type: "Appraisal",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.appraisal_completed
        });
      }
      if (contract.final_walkthrough_date) {
        dates.push({
          date: contract.final_walkthrough_date,
          type: "Final Walkthrough",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.final_walkthrough_completed
        });
      }
      if (contract.closing_date) {
        dates.push({
          date: contract.closing_date,
          type: "Closing",
          property: contract.property_address,
          contractId: contract.id,
          isFromCounterOffer: contract.is_counter_offer,
          usingOriginalDates: contract._using_original_dates,
          completed: contract.closing_completed
        });
      }
    });
    
    return dates
      .filter(d => !d.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [getActiveContracts]);

  const allActiveContracts = getActiveContracts();
  const activeContractsCount = allActiveContracts.filter(c => 
    !c.closing_completed
  ).length;

  const closingThisMonth = allActiveContracts.filter(c => {
    if (!c.closing_date || c.closing_completed) return false;
    const closing = new Date(c.closing_date);
    const now = new Date();
    return closing.getMonth() === now.getMonth() && 
           closing.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Trial Status Banner */}
        {user?.subscription_tier === 'trial' && trialInfo?.isActive && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">🎉</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  Free Trial Active - {trialInfo.daysLeft} Days Left
                </h3>
                <p className="text-blue-800 mb-4">
                  You have <strong>{trialInfo.daysLeft} days</strong> or <strong>until your first contract is uploaded</strong> (whichever comes first) to use ContractFlowAI completely free!
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${(trialInfo.daysElapsed / 60) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{trialInfo.daysElapsed}/60 days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Countdown Warning */}
        {showUpgradeCountdown && !showExpiredWarning && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-2xl">⏰</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-purple-900 mb-2">
                  {user?.subscription_tier === 'trial' 
                    ? `🚀 Only ${trialInfo?.daysLeft} Days Left in Your Trial!`
                    : `⏰ Upgrade Before Month End!`}
                </h3>
                <p className="text-purple-800 mb-4">
                  {user?.subscription_tier === 'trial'
                    ? `You're almost out of time! Upgrade now to Professional (15 contracts/month) or Team (unlimited) to keep managing your deals without interruption.`
                    : `Your Budget plan (2 contracts/month) resets soon. Upgrade to Professional for 15 contracts/month or Team for unlimited contracts and team management!`}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl("Pricing")}>
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Professional
                    </Button>
                  </Link>
                  <div className="text-sm text-purple-700 flex items-center gap-2">
                    <span className="font-semibold">💎 Most Popular:</span>
                    <span>Professional - $49/mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired Subscription Warning */}
        {showExpiredWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-2">
                  {user?.subscription_tier === 'trial' ? '🎉 Trial Complete!' : 'Your Subscription Has Expired'}
                </h3>
                <p className="text-red-800 mb-4">
                  {user?.subscription_tier === 'trial'
                    ? 'Your 60-day trial has ended or you\'ve uploaded your first contract. Upgrade to Professional or Team to continue using ContractFlowAI!'
                    : 'You can still view your data, but you cannot upload new contracts or use premium features. Reactivate your subscription to continue.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl("Pricing")}>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {user?.subscription_tier === 'trial' ? 'Upgrade to Professional' : 'Reactivate Subscription'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Limit Reached Warning */}
        {contractLimitInfo?.showLimitWarning && (
          <Alert className="bg-orange-50 border-orange-300 text-orange-800 flex items-center p-4 rounded-xl shadow-sm">
            <CreditCard className="h-5 w-5 mr-3 flex-shrink-0 text-orange-600" />
            <div>
                <AlertTitle className="font-semibold text-lg text-orange-900">Contract Limit Reached</AlertTitle>
                <AlertDescription className="text-orange-700">
                    You have used <strong>{contractLimitInfo.used}</strong> of your <strong>{contractLimitInfo.limit}</strong> allowed contracts this month for the {contractLimitInfo.tierName} plan.
                    <br />
                    <strong>Upgrade to Professional (15 contracts) or Team (unlimited)</strong> to keep closing deals!
                </AlertDescription>
                <div className="mt-4">
                    <Link to={createPageUrl("Pricing")}>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                            Upgrade to Professional
                        </Button>
                    </Link>
                </div>
            </div>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              {user?.organization_role === 'team_lead' 
                ? 'Team Overview - All Contracts' 
                : 'Manage your real estate contracts'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Upload")}>
              <Button 
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!contractLimitInfo?.canUpload || isLoading}
              >
                <Plus className="w-5 h-5 mr-2" />
                Upload Contract
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
          <StatsOverview
            title="Active Contracts"
            value={activeContractsCount}
            icon={TrendingUp}
            color="blue"
            isLoading={isLoading}
          />
          <StatsOverview
            title="Closing This Month"
            value={closingThisMonth}
            icon={Clock}
            color="gold"
            isLoading={isLoading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContractsList 
              contracts={contracts.filter(c => {
                const activeContract = allActiveContracts.find(ac => ac.id === c.id);
                return activeContract && !activeContract.closing_completed;
              })}
              isLoading={isLoading}
              onContractUpdate={loadData}
            />
          </div>
          <div>
            <UpcomingDates 
              dates={getUpcomingDates()}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
