// src/pages/Referrals.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Mail, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ReferralsPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      const { data: myReferrals, error: refError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_email", profile.email)
        .order("created_at", { ascending: false });

      if (refError) throw refError;

      if (myReferrals && myReferrals.length > 0) {
        setReferralCode(myReferrals[0].ref_code);
        setReferrals(myReferrals);
      } else {
        setReferralCode(null);
        setReferrals([]);
      }
    } catch (err) {
      console.error("Error loading referrals:", err);
      setError(err.message || "Error loading referrals");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!userProfile) return;
    setIsGenerating(true);
    setError(null);
    try {
      // Generate code like CF-XXXXXX
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `CF-${randomPart}`;

      const { error: insertError } = await supabase.from("referrals").insert({
        referrer_id: userProfile.id,
        referrer_email: userProfile.email,
        ref_code: code,
        status: "pending",
      });

      if (insertError) throw insertError;

      setReferralCode(code);
      await loadData();
    } catch (err) {
      console.error("Error generating referral code:", err);
      setError(err.message || "Error generating referral code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = `https://contractflowai.us/Landing?code=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeReferrals = referrals.filter(
    (r) => r.status === "active" || r.status === "converted"
  );
  const convertedReferrals = referrals.filter((r) => r.status === "converted");

  const referralLink = referralCode
    ? `https://contractflowai.us/Landing?code=${referralCode}`
    : "";

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    active: "bg-blue-100 text-blue-800",
    converted: "bg-green-100 text-green-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>
            Please sign in to access the referral program.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            🎁 Referral Program
          </h1>
          <p className="text-gray-600">
            Invite other agents and earn free months!
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Referral Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Referrals</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {activeReferrals.length}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Months Earned</p>
                  <p className="text-3xl font-bold text-green-600">
                    {convertedReferrals.length}
                  </p>
                </div>
                <Gift className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Potential Rewards</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {activeReferrals.filter((r) => !r.reward_issued).length}
                  </p>
                </div>
                <Mail className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        {/* (keep your existing How It Works section; it doesn’t depend on Base44) */}

        {/* Referral Link */}
        {!referralCode ? (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <Gift className="w-16 h-16 mx-auto mb-4 text-[#1e3a5f]" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Generate Your Referral Link
              </h3>
              <p className="text-gray-600 mb-6">
                Start earning free months by referring other agents
              </p>
              <Button
                onClick={generateReferralCode}
                disabled={isGenerating}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] px-8"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate My Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-2 border-[#1e3a5f]">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-xl">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="font-mono text-sm" />
                <Button
                  onClick={copyReferralLink}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Share this link with other real estate agents. When they sign up
                and upgrade to a paid plan, you'll earn 1 free month!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Referral History */}
        {referrals.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-xl">Referral History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {ref.status === "converted" ? (
                          <Gift className="w-5 h-5 text-green-600" />
                        ) : (
                          <Users className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {ref.referred_email || "Pending signup"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ref.created_at
                            ? new Date(ref.created_at).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusColors[ref.status] || statusColors.pending}>
                        {ref.status}
                      </Badge>
                      {ref.reward_issued && (
                        <Badge className="bg-green-100 text-green-800">
                          ✓ Rewarded
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
