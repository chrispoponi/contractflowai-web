
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { differenceInDays } from "date-fns";

import ContractForm from "../components/upload/ContractForm";
import { getCurrentProfile, redirectToLogin, updateCurrentProfile } from "@/lib/supabaseAuth";
import { supabaseEntities } from "@/lib/supabaseEntities";
import { uploadContractFile } from "@/lib/storage";
import { invokeFunction } from "@/lib/supabaseFunctions";

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [user, setUser] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [contractLimit, setContractLimit] = useState(null);
  const fileInputRef = useRef(null);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const reassuringQuotes = [
    "☕ Sit back and relax, I've got this",
    "🥤 You've worked hard today, grab a refreshing beverage",
    "✨ It's my turn to make your life a little easier",
    "🎯 Reading every detail so you don't have to",
    "🧠 AI is analyzing all those contract dates for you",
    "⏰ This usually takes 10-15 seconds, hang tight",
    "📋 Extracting all the important stuff automatically",
    "🏡 Making real estate paperwork less painful, one contract at a time"
  ];

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % reassuringQuotes.length);
      }, 7000); // Change message every 7 seconds (half speed)
    }
    return () => clearInterval(interval);
  }, [isProcessing, reassuringQuotes.length]);

  const calculateLimitsFromUser = (userData) => {
    const limits = {
      trial: 1,
      beta: Infinity, // Unlimited for beta (professional level)
      team_beta: Infinity, // Unlimited for team beta
      budget: 2,
      professional: 15,
      team: Infinity
    };
    
    const userLimit = limits[userData.subscription_tier] || 1;
    setContractLimit(userLimit);
    
    let shouldShowQuickUpgrade = false;
    // This logic is a preliminary check; `loadData` will perform the definitive check
    // including contracts used and trial end dates.
    if (userData.subscription_tier === 'trial') {
      shouldShowQuickUpgrade = false; // Will be properly evaluated in loadData
    } else if (userData.subscription_tier === 'beta' || userData.subscription_tier === 'team_beta') { // Beta users never see upgrade prompt
      shouldShowQuickUpgrade = false; 
    } else if (userData.subscription_tier !== 'trial' && userData.subscription_status !== 'active') {
      shouldShowQuickUpgrade = true;
    } else if ((userData.contracts_used_this_month || 0) >= userLimit) {
      shouldShowQuickUpgrade = true;
    }
    setShowUpgradePrompt(shouldShowQuickUpgrade);
  };

  const checkAuthAndLoadData = async () => {
    try {
      const cachedUser = sessionStorage.getItem('user_data');
      if (cachedUser) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        calculateLimitsFromUser(userData);
      }
      
      const verifiedUserData = await getCurrentProfile();
      if (!verifiedUserData) {
        redirectToLogin(window.location.pathname);
        return;
      }
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      redirectToLogin(window.location.pathname);
      sessionStorage.removeItem('user_data');
    }
  };

  const loadData = async () => {
    try {
      let userData = await getCurrentProfile();
      if (!userData) {
        throw new Error("Unable to load profile");
      }

      if (!userData.trial_start_date && userData.subscription_tier === 'trial') {
        const today = new Date();
        const trialStartDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 60); // 60 days trial
        const trialEndDate = endDate.toISOString().split('T')[0];
        
        userData = await updateCurrentProfile({
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
          contracts_used_this_month: 0,
          monthly_reset_date: today.toISOString().split('T')[0]
        });
      }
      
      const today = new Date();
      const lastResetDate = userData.monthly_reset_date ? new Date(userData.monthly_reset_date) : null;
      
      if (lastResetDate && (lastResetDate.getMonth() !== today.getMonth() || lastResetDate.getFullYear() !== today.getFullYear())) {
        userData = await updateCurrentProfile({
          contracts_used_this_month: 0,
          monthly_reset_date: today.toISOString().split('T')[0]
        });
      }

      const limits = {
        trial: 1,
        beta: Infinity, // Add beta tier here
        team_beta: Infinity, // Add team_beta tier here
        budget: 2,
        professional: 15,
        team: Infinity
      };
      
      const userLimit = limits[userData.subscription_tier] || 1;
      setContractLimit(userLimit);
      
      let shouldShowUpgrade = false;
      
      if (userData.subscription_tier === 'beta' || userData.subscription_tier === 'team_beta') { // Beta users never see upgrade prompt
        shouldShowUpgrade = false; 
      } else if (userData.subscription_tier === 'trial') {
        const contracts = await supabaseEntities.Contract.list();
        const daysElapsed = userData.trial_start_date ? differenceInDays(today, new Date(userData.trial_start_date)) : 0;
        
        const trialEndDate = userData.trial_end_date ? new Date(userData.trial_end_date) : null;
        const daysRemaining = trialEndDate ? differenceInDays(trialEndDate, today) : Infinity;

        // Condition for actual trial end (contract limit or 60 days passed)
        if (contracts.length >= userLimit || daysElapsed >= 60 || daysRemaining <= 0) { 
          shouldShowUpgrade = true;
        } 
        // Condition for 10-day countdown to upgrade
        else if (daysRemaining <= 10 && daysRemaining > 0) { 
          shouldShowUpgrade = true;
        }
      } else {
        if ((userData.contracts_used_this_month || 0) >= userLimit) {
          shouldShowUpgrade = true;
        }
      }
      if (userData.subscription_tier !== 'trial' && userData.subscription_tier !== 'beta' && userData.subscription_tier !== 'team_beta' && userData.subscription_status !== 'active') {
        shouldShowUpgrade = true;
      }

      setShowUpgradePrompt(shouldShowUpgrade);
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Error loading user data. Please refresh the page.");
      sessionStorage.removeItem('user_data');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (showUpgradePrompt) {
      setError("You've reached your monthly contract limit or your trial has ended. Please upgrade to continue.");
      return;
    }

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/"))) {
      processFile(droppedFile);
    } else {
      setError("Please upload a PDF or image file");
    }
  };

  const handleFileInput = (e) => {
    if (showUpgradePrompt) {
      setError("You've reached your monthly contract limit or your trial has ended. Please upgrade to continue.");
      return;
    }
    
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile) => {
    if (showUpgradePrompt) {
      setError("You've reached your monthly contract limit or your trial has ended. Please upgrade to continue.");
      return;
    }

    if (!selectedFile) {
      setError("No file selected");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File too large. Maximum size is 50MB");
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Only PDF, JPEG, and PNG files are allowed");
      return;
    }
    
    console.log("Processing file:", selectedFile.name, selectedFile.type, selectedFile.size);
    
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);

    try {
      console.log("Uploading file to Supabase Storage...");
      const activeUser = user || (await getCurrentProfile());
      if (!activeUser) {
        redirectToLogin(window.location.pathname);
        return;
      }

      const uploadResult = await uploadContractFile({
        file: selectedFile,
        userId: activeUser.id,
      });
      
      const file_url = uploadResult.signedUrl;
      console.log("File uploaded to storage:", uploadResult.path);

      // Define Contract schema inline with detailed descriptions
      const contractSchema = {
        type: "object",
        properties: {
          property_address: { type: "string", description: "Full property address" },
          representing_side: { type: "string", enum: ["buyer", "seller"], description: "Which side the agent represents" },
          buyer_name: { type: "string", description: "Full name of the buyer(s)" },
          buyer_email: { type: "string", description: "Buyer's email address" },
          buyer_phone: { type: "string", description: "Buyer's phone number" },
          seller_name: { type: "string", description: "Full name of the seller(s)" },
          seller_email: { type: "string", description: "Seller's email address" },
          seller_phone: { type: "string", description: "Seller's phone number" },
          purchase_price: { type: "number", description: "Purchase price in dollars" },
          earnest_money: { type: "number", description: "Earnest money deposit amount" },
          contract_date: { type: "string", format: "date", description: "Date contract was signed" },
          closing_date: { type: "string", format: "date", description: "Scheduled closing date" },
          inspection_date: { type: "string", format: "date", description: "Inspection date" },
          inspection_response_date: { type: "string", format: "date", description: "Deadline for inspection response" },
          loan_contingency_date: { type: "string", format: "date", description: "Loan contingency deadline" },
          appraisal_date: { type: "string", format: "date", description: "Appraisal date" },
          final_walkthrough_date: { type: "string", format: "date", description: "Final walkthrough date" },
          status: { type: "string", description: "Contract status" }
        }
      };

      console.log("Extracting contract data with AI...");
      
      // First pass: Extract all data including contact info
      const extractResult = await invokeFunction('extract-contract-data', {
        file_url,
        json_schema: contractSchema
      });
      console.log("Extraction result:", extractResult);

      if (extractResult.status === "success" && extractResult.output) {
        console.log("Verifying dates and contact information...");
        
        // Enhanced verification with focus on contact info
        const verification = await invokeFunction('verify-contract-data', {
          prompt: `You are a real estate contract data extractor. Your job is to verify ALL information with 100% accuracy.

CRITICAL RULES:
1. Read each date TWICE to ensure accuracy
2. Format all dates as YYYY-MM-DD
3. Extract COMPLETE email addresses (must include @domain.com)
4. Extract phone numbers in any format they appear
5. If you're not 100% certain about any field, write "UNCERTAIN"

Here is the contract data already extracted:
${JSON.stringify(extractResult.output, null, 2)}

Review the document carefully and return corrected/verified data. Pay special attention to:
- Email addresses (buyer_email, seller_email) - must be complete and valid
- Phone numbers (buyer_phone, seller_phone) - extract exactly as shown
- All dates - verify they are correct

Return in this format:
{
  "buyer_email": "email@example.com or UNCERTAIN",
  "buyer_phone": "phone number or UNCERTAIN",
  "seller_email": "email@example.com or UNCERTAIN", 
  "seller_phone": "phone number or UNCERTAIN",
  "contract_date": "YYYY-MM-DD or UNCERTAIN",
  "closing_date": "YYYY-MM-DD or UNCERTAIN",
  "inspection_date": "YYYY-MM-DD or UNCERTAIN",
  "inspection_response_date": "YYYY-MM-DD or UNCERTAIN",
  "loan_contingency_date": "YYYY-MM-DD or UNCERTAIN",
  "appraisal_date": "YYYY-MM-DD or UNCERTAIN",
  "final_walkthrough_date": "YYYY-MM-DD or UNCERTAIN"
}`,
          response_json_schema: {
            type: "object",
            properties: {
              buyer_email: { type: "string" },
              buyer_phone: { type: "string" },
              seller_email: { type: "string" },
              seller_phone: { type: "string" },
              contract_date: { type: "string" },
              closing_date: { type: "string" },
              inspection_date: { type: "string" },
              inspection_response_date: { type: "string" },
              loan_contingency_date: { type: "string" },
              appraisal_date: { type: "string" },
              final_walkthrough_date: { type: "string" }
            }
          },
          file_urls: [file_url]
        });
        console.log("Verification result:", verification);

        // Merge verified data with extracted data
        const verifiedData = { ...extractResult.output };
        const uncertainFields = [];
        
        Object.keys(verification).forEach(key => {
          const value = verification[key];
          if (value && value !== "UNCERTAIN" && value !== "") {
            verifiedData[key] = value;
          } else if (value === "UNCERTAIN") {
            // Keep original if AI is uncertain
            uncertainFields.push(key);
          }
        });

        console.log("Generating summary...");
        const summaryResponse = await invokeFunction('summarize-contract', {
          prompt: `You are reviewing a real estate contract. Summarize the key terms in 2-3 simple, clear sentences that a homebuyer would understand. Focus on: purchase price, important dates, and any special conditions.`,
          contract: verifiedData
        });
        const summary =
          typeof summaryResponse === "string"
            ? summaryResponse
            : summaryResponse?.summary || "";

        setExtractedData({
          ...verifiedData,
          contract_file_url: uploadResult.publicUrl || file_url,
          storage_path: uploadResult.path,
          plain_language_summary: summary,
          agent_notes: "",
          _uncertain_fields: uncertainFields // Track uncertain fields for user review
        });
        
        // Log if any contact info is missing
        if (!verifiedData.buyer_email && !verifiedData.seller_email) {
          console.warn("⚠️ No email addresses found in contract. User will need to add manually.");
        }
        if (!verifiedData.buyer_phone && !verifiedData.seller_phone) {
          console.warn("⚠️ No phone numbers found in contract. User will need to add manually.");
        }
      } else {
        throw new Error("Could not extract contract data");
      }
    } catch (err) {
      console.error("Error processing contract:", err);
      setError(`Error processing contract: ${err.message || "Unknown error"}. Please try again or enter details manually.`);
    }

    setIsProcessing(false);
  };

  const handleSave = async (contractData) => {
    setIsProcessing(true);
    try {
      await supabaseEntities.Contract.create(contractData);
      
      // Exclude 'team', 'beta', and 'team_beta' from contract count increment
      if (user && user.subscription_tier !== 'team' && user.subscription_tier !== 'beta' && user.subscription_tier !== 'team_beta') { 
        const updatedContractsUsed = (user.contracts_used_this_month || 0) + 1;
        const updatedUser = { ...user, contracts_used_this_month: updatedContractsUsed };
        setUser(updatedUser);
        sessionStorage.setItem('user_data', JSON.stringify(updatedUser));

        await updateCurrentProfile({
          contracts_used_this_month: updatedContractsUsed
        });
      }
      
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      console.error("Error saving contract:", err);
      setError("Error saving contract. Please try again.");
    }
    setIsProcessing(false);
  };

  // Show upgrade screen if limit reached or trial expired
  if (showUpgradePrompt) {
    // Dynamic trial messages based on status
    let currentUpgradeInfoForTrial = {
        title: "🎉 Trial Complete!",
        message: "You've used your free contract or your trial has ended. Upgrade to Professional or Team to continue managing your real estate deals!",
        recommendations: [
            { tier: "professional", reason: "Perfect for active agents - 15 contracts/month for $49" },
            { tier: "team", reason: "Best for brokerages - unlimited contracts + team features" }
        ]
    };
    
    if (user?.subscription_tier === 'trial') {
        const today = new Date();
        const contractsUsed = (user.contracts_used_this_month || 0);
        const trialContractLimit = 1;
        const trialEndDate = user.trial_end_date ? new Date(user.trial_end_date) : null;
        const daysRemaining = trialEndDate ? differenceInDays(trialEndDate, today) : Infinity;

        if (contractsUsed >= trialContractLimit) {
            currentUpgradeInfoForTrial.title = "🎉 Trial Contract Used!";
            currentUpgradeInfoForTrial.message = "You've used your free contract. Upgrade to Professional or Team to continue managing your real estate deals!";
        } else if (daysRemaining <= 0) {
            currentUpgradeInfoForTrial.title = "🎉 Trial Ended!";
            currentUpgradeInfoForTrial.message = "Your free trial has ended. Upgrade to Professional or Team to continue managing your real estate deals!";
        } else if (daysRemaining <= 10 && daysRemaining > 0) {
            currentUpgradeInfoForTrial.title = `⏳ Trial Ending Soon (${daysRemaining} Days Left)!`;
            currentUpgradeInfoForTrial.message = `Your free trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Upgrade to Professional or Team now to ensure uninterrupted service!`;
        }
    }

    const upgradeMessages = {
      trial: currentUpgradeInfoForTrial,
      budget: {
        title: "📈 You've Hit Your Monthly Limit!",
        message: `You've uploaded ${user?.contracts_used_this_month || 0} contracts this month (Budget plan: ${contractLimit || 2}/month). Upgrade to Professional for 15 contracts or Team for unlimited!`, // Message updated
        recommendations: [
          { tier: "professional", reason: "Handle up to 15 contracts per month - perfect for full-time agents" }, // Reason updated
          { tier: "team", reason: "Unlimited contracts for you and your team" }
        ]
      },
      professional: {
        title: "🔥 You're Crushing It!",
        message: `You've uploaded ${user?.contracts_used_this_month || 0} contracts this month (Professional plan: ${contractLimit || 15}/month). Consider upgrading to Team for unlimited contracts and team management features!`, // Message updated
        recommendations: [
          { tier: "team", reason: "Unlimited contracts for you and your team" }
        ]
      }
    };

    // Fallback for generic inactive subscription or unrecognized tier
    let upgradeInfo = upgradeMessages[user?.subscription_tier];
    if (!upgradeInfo || (user?.subscription_tier !== 'trial' && user?.subscription_tier !== 'beta' && user?.subscription_tier !== 'team_beta' && user?.subscription_status !== 'active')) {
      upgradeInfo = {
        title: "⚠️ Subscription Inactive",
        message: "Your subscription is not active. Please reactivate or upgrade to continue uploading contracts.",
        recommendations: [
          { tier: "professional", reason: "Most popular - 15 contracts/month" }, // Recommendations updated
          { tier: "team", reason: "Best for teams - unlimited contracts" } // Recommendations updated
        ]
      };
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-full flex items-center justify-center">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{upgradeInfo.title}</h1>
              <p className="text-lg text-gray-700 mb-6">{upgradeInfo.message}</p>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">💡 Recommended for you:</p>
                {upgradeInfo.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-sm text-blue-800">
                    <strong className="capitalize">{rec.tier}</strong> - {rec.reason}
                  </p>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Pricing"))}
                className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white px-8 py-6 text-lg"
              >
                View Pricing & Upgrade to Professional
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("Dashboard"))}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to display contract usage information
  const getUsageInfo = () => {
    if (!user) return null;
    
    if (user.subscription_tier !== 'trial' && user.subscription_tier !== 'beta' && user.subscription_tier !== 'team_beta' && user.subscription_status !== 'active') {
        return "Subscription Inactive";
    }

    const limitsDisplay = {
      trial: `First contract free or 60 days.`,
      beta: "Unlimited contracts (Beta - Professional Access)", // Added beta tier display
      team_beta: "Unlimited contracts (Team Beta Access)", // Added team_beta tier display
      budget: `${user.contracts_used_this_month || 0}/${contractLimit || 2} contracts this month`,
      professional: `${user.contracts_used_this_month || 0}/${contractLimit || 15} contracts this month`,
      team: "Unlimited contracts"
    };
    
    return limitsDisplay[user.subscription_tier] || "";
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Upload Contract</h1>
            <p className="text-gray-600 mt-1">Upload and automatically extract contract details</p>
          </div>
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-sm font-semibold text-blue-900">
                {getUsageInfo()}
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!extractedData && !isProcessing && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-[#1e3a5f] transition-colors duration-300">
            <CardContent className="p-0">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`p-12 text-center transition-colors duration-200 ${
                  dragActive ? "bg-blue-50" : "bg-white"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl flex items-center justify-center shadow-lg">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Real Estate Contract
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Drag and drop your contract here, or click to browse. We'll automatically extract all the important details.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Select Contract
                </Button>
                <p className="text-sm text-gray-500 mt-6">
                  Supports PDF, PNG, and JPEG files
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isProcessing && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Processing Contract
              </h3>
              <p className="text-gray-600 mb-6">
                Reading and extracting contract details...
              </p>
              
              {/* Scrolling Banner */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-xl p-6 border-2 border-blue-200 overflow-hidden">
                <div 
                  className="text-lg font-medium text-[#1e3a5f] transition-all duration-1000 ease-in-out transform"
                  style={{
                    animation: 'fadeSlide 7s infinite', // Update the div animation duration
                  }}
                >
                  {reassuringQuotes[currentQuoteIndex]}
                </div>
              </div>

              <style>
                {`
                  @keyframes fadeSlide {
                    0% {
                      opacity: 0;
                      transform: translateY(10px);
                    }
                    10% {
                      opacity: 1;
                      transform: translateY(0);
                    }
                    90% {
                      opacity: 1;
                      transform: translateY(0);
                    }
                    100% {
                      opacity: 0;
                      transform: translateY(-10px);
                    }
                  }
                `}
              </style>
            </CardContent>
          </Card>
        )}

        {extractedData && !isProcessing && (
          <ContractForm
            initialData={extractedData}
            onSave={handleSave}
            onCancel={() => {
              setExtractedData(null);
              setFile(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
