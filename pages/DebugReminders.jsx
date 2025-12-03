import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DebugRemindersPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get logged-in user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        navigate(createPageUrl("Login"));
        return;
      }

      // Pull user row from "users" table
      const { data: userRow } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.user.id)
        .single();

      setUser(userRow);

      // Load contracts
      const { data: contractRows } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", authUser.user.id);

      setContracts(contractRows || []);

      // === Begin Diagnostic Logic ===
      const foundIssues = [];

      // Email notifications enabled?
      if (!userRow.email_notifications_enabled) {
        foundIssues.push({
          type: "error",
          message: "❌ Email notifications are DISABLED",
          fix: "Go to Reminder Settings and enable them"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: "✅ Email notifications are ENABLED"
        });
      }

      // Subscription active?
      if (userRow.subscription_status !== "active") {
        foundIssues.push({
          type: "error",
          message: `❌ Subscription status: "${userRow.subscription_status}"`,
          fix: "Update subscription in Billing Settings"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: "✅ Subscription status is ACTIVE"
        });
      }

      // Reminder days?
      const hasReminderDays =
        (userRow.reminder_inspection_days?.length ?? 0) > 0 ||
        (userRow.reminder_closing_days?.length ?? 0) > 0;

      if (!hasReminderDays) {
        foundIssues.push({
          type: "warning",
          message:
            "⚠️ No custom reminder days configured (defaults: 1,3,5,7)",
          fix: "Edit Reminder Settings"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: "✅ Custom reminder days found"
        });
      }

      // Any dates in contracts?
      const contractsWithDates = (contractRows || []).filter(
        (c) =>
          c.closing_date ||
          c.inspection_date ||
          c.loan_contingency_date ||
          c.appraisal_date ||
          c.final_walkthrough_date
      );

      if (contractsWithDates.length === 0) {
        foundIssues.push({
          type: "error",
          message: "❌ No contracts have key dates",
          fix: "Upload a contract or add dates"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: `✅ ${contractsWithDates.length} contract(s) contain dates`
        });
      }

      // Check for reminders that SHOULD send today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reminderDays = [1, 3, 5, 7];
      const upcoming = [];

      contractsWithDates.forEach((contract) => {
        const dateFields = [
          { date: contract.inspection_date, type: "Inspection", completed: contract.inspection_completed },
          { date: contract.inspection_response_date, type: "Inspection Response", completed: contract.inspection_response_completed },
          { date: contract.closing_date, type: "Closing", completed: contract.closing_completed },
          { date: contract.loan_contingency_date, type: "Loan Contingency", completed: contract.loan_contingency_completed },
          { date: contract.appraisal_date, type: "Appraisal", completed: contract.appraisal_completed },
          { date: contract.final_walkthrough_date, type: "Final Walkthrough", completed: contract.final_walkthrough_completed }
        ];

        dateFields.forEach(({ date, type, completed }) => {
          if (!date || completed) return;

          const target = new Date(date);
          target.setHours(0, 0, 0, 0);

          const diffDays = Math.floor((target - today) / 86400000);
          if (reminderDays.includes(diffDays)) {
            upcoming.push({
              contract: contract.property_address,
              type,
              date,
              daysUntil: diffDays
            });
          }
        });
      });

      if (upcoming.length === 0) {
        foundIssues.push({
          type: "warning",
          message: "⚠️ No dates are exactly 1,3,5,7 days away",
          fix: "Create test contract with a date exactly 3 days from today"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: `✅ ${upcoming.length} reminders should send TODAY`,
          details: upcoming
        });
      }

      setIssues(foundIssues);
    } catch (err) {
      console.error(err);
      setIssues([{ type: "error", message: `❌ Error: ${err.message}` }]);
    }

    setIsLoading(false);
  };

  const testFunctionNow = async () => {
    setIsTesting(true);

    try {
      const { data, error } = await supabase.rpc("send_daily_reminders");

      if (error) throw error;

      setTestResult({
        success: true,
        emailsSent: data?.emails_sent ?? 0,
        results: data?.results ?? [],
        timestamp: data?.timestamp ?? new Date().toISOString()
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message
      });
    }

    setIsTesting(false);
  };

  if (isLoading)
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔍 Reminder Debug Tool</h1>
            <p className="text-gray-600 mt-1">Check if reminders are configured correctly</p>
          </div>
        </div>

        {/* User Summary */}
        <Card className="shadow-lg border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle>Your Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Email:</span>
              <span className="text-gray-700">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Email Notifications:</span>
              <span
                className={`font-bold ${
                  user?.email_notifications_enabled ? "text-green-600" : "text-red-600"
                }`}
              >
                {user?.email_notifications_enabled ? "✅ ENABLED" : "❌ DISABLED"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Subscription Status:</span>
              <span
                className={`font-bold ${
                  user?.subscription_status === "active"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {user?.subscription_status?.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Contracts with Dates:</span>
              <span className="text-gray-700 font-semibold">
                {contracts.filter((c) => c.closing_date || c.inspection_date).length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostic Issues */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-2 ${
                  issue.type === "error"
                    ? "border-red-300 bg-red-50"
                    : issue.type === "warning"
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-green-300 bg-green-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {issue.type === "error" && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  {issue.type === "warning" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  {issue.type === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}

                  <div className="flex-1">
                    <p className="font-semibold">{issue.message}</p>

                    {issue.fix && (
                      <p className="text-sm text-gray-600 mt-1">Fix: {issue.fix}</p>
                    )}

                    {issue.details && (
                      <div className="mt-2 space-y-1">
                        {issue.details.map((d, j) => (
                          <div
                            key={j}
                            className="text-sm bg-white p-2 rounded border"
                          >
                            <strong>{d.type}</strong> in {d.daysUntil} day(s) —{" "}
                            {d.contract}
                            <br />
                            <span className="text-gray-500">
                              Date: {new Date(d.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Run function now */}
        <Card className="shadow-lg border-l-4 border-purple-500">
          <CardHeader>
            <CardTitle>Test Function Now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Trigger the daily reminder function manually to confirm execution.
            </p>
            <Button
              onClick={testFunctionNow}
              disabled={isTesting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {isTesting ? "Testing..." : "⚡ Run Reminder Function"}
            </Button>

            {testResult && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  testResult.success
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}

                  <div className="flex-1">
                    <p className="font-bold text-lg mb-2">
                      {testResult.success
                        ? `✅ SUCCESS — Sent ${testResult.emailsSent} email(s)`
                        : `❌ FAILED: ${testResult.error}`}
                    </p>

                    {testResult.results?.length > 0 && (
                      <div className="space-y-1 text-sm">
                        {testResult.results.map((r, k) => (
                          <div key={k} className="bg-white p-2 rounded">
                            📧 {r.user}: {r.reminders} reminder(s)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How reminders work */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-3">📋 How Reminders Work</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Runs every morning at **8:00AM**</li>
              <li>• Looks for dates **1,3,5,7 days away**</li>
              <li>• Only sends if user has:  
                <br />→ active subscription  
                <br />→ email notifications enabled
              </li>
              <li>• Skips completed items (e.g. completed inspection)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
