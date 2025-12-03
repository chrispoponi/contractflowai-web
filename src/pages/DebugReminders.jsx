import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCurrentProfile, redirectToLogin } from "@/lib/supabaseAuth";
import { supabaseEntities } from "@/lib/supabaseEntities";
import { invokeFunction } from "@/lib/supabaseFunctions";

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
      const userData = await getCurrentProfile();
      if (!userData) {
        redirectToLogin(window.location.pathname);
        return;
      }
      setUser(userData);
      
      const allContracts = await supabaseEntities.Contract.list();
      setContracts(allContracts);
      
      // Check for issues
      const foundIssues = [];
      
      if (!userData.email_notifications_enabled) {
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
      
      if (userData.subscription_status !== 'active') {
        foundIssues.push({
          type: "error",
          message: `❌ Subscription status is "${userData.subscription_status}" (needs to be "active")`,
          fix: "Go to Admin Subscriptions and set status to 'active'"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: "✅ Subscription status is ACTIVE"
        });
      }
      
      // Check reminder days configuration
      const hasReminderDays = 
        userData.reminder_inspection_days?.length > 0 ||
        userData.reminder_closing_days?.length > 0;
        
      if (!hasReminderDays) {
        foundIssues.push({
          type: "warning",
          message: "⚠️ No reminder days configured (will use defaults: 7, 3, 1)",
          fix: "Go to Reminder Settings to customize"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: "✅ Custom reminder days are configured"
        });
      }
      
      // Check contracts for dates
      const contractsWithDates = allContracts.filter(c => 
        c.closing_date || c.inspection_date || c.loan_contingency_date || 
        c.appraisal_date || c.final_walkthrough_date
      );
      
      if (contractsWithDates.length === 0) {
        foundIssues.push({
          type: "error",
          message: "❌ No contracts have any dates set",
          fix: "Upload a contract or add dates to existing contracts"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: `✅ Found ${contractsWithDates.length} contract(s) with dates`
        });
      }
      
      // Check if any dates should trigger reminders TODAY
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reminderDays = [1, 3, 5, 7];
      let upcomingReminders = [];
      
      contractsWithDates.forEach(contract => {
        const dates = [
          { date: contract.inspection_date, type: "Inspection", completed: contract.inspection_completed },
          { date: contract.inspection_response_date, type: "Inspection Response", completed: contract.inspection_response_completed },
          { date: contract.closing_date, type: "Closing", completed: contract.closing_completed },
          { date: contract.loan_contingency_date, type: "Loan Contingency", completed: contract.loan_contingency_completed },
          { date: contract.appraisal_date, type: "Appraisal", completed: contract.appraisal_completed },
          { date: contract.final_walkthrough_date, type: "Final Walkthrough", completed: contract.final_walkthrough_completed }
        ];
        
        dates.forEach(({ date, type, completed }) => {
          if (!date || completed) return;
          
          const eventDate = new Date(date);
          eventDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
          
          if (reminderDays.includes(daysUntil)) {
            upcomingReminders.push({
              contract: contract.property_address,
              type,
              date,
              daysUntil
            });
          }
        });
      });
      
      if (upcomingReminders.length === 0) {
        foundIssues.push({
          type: "warning",
          message: "⚠️ No dates are exactly 1, 3, 5, or 7 days away",
          fix: "Create a test contract with a date exactly 3 days from today"
        });
      } else {
        foundIssues.push({
          type: "success",
          message: `✅ Found ${upcomingReminders.length} reminder(s) that should send TODAY!`,
          details: upcomingReminders
        });
      }
      
      setIssues(foundIssues);
    } catch (error) {
      console.error("Error:", error);
      setIssues([{
        type: "error",
        message: `❌ Error loading data: ${error.message}`
      }]);
    }
    setIsLoading(false);
  };

  const testFunctionNow = async () => {
    setIsTesting(true);
    try {
      const data = await invokeFunction('sendDailyReminders');
      setTestResult({
        success: data.success || data.emailsSent > 0,
        emailsSent: data.emailsSent || 0,
        results: data.results || [],
        timestamp: data.timestamp
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
              <span className={`font-bold ${user?.email_notifications_enabled ? 'text-green-600' : 'text-red-600'}`}>
                {user?.email_notifications_enabled ? '✅ ENABLED' : '❌ DISABLED'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Subscription Status:</span>
              <span className={`font-bold ${user?.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {user?.subscription_status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Contracts with Dates:</span>
              <span className="text-gray-700 font-semibold">
                {contracts.filter(c => c.closing_date || c.inspection_date).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${
                issue.type === 'error' ? 'border-red-300 bg-red-50' :
                issue.type === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                'border-green-300 bg-green-50'
              }`}>
                <div className="flex items-start gap-3">
                  {issue.type === 'error' ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> :
                   issue.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" /> :
                   <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{issue.message}</p>
                    {issue.fix && (
                      <p className="text-sm text-gray-600 mt-1">Fix: {issue.fix}</p>
                    )}
                    {issue.details && (
                      <div className="mt-2 space-y-1">
                        {issue.details.map((detail, i) => (
                          <div key={i} className="text-sm bg-white p-2 rounded border">
                            <strong>{detail.type}</strong> in {detail.daysUntil} day(s) - {detail.contract}
                            <br/>
                            <span className="text-gray-500">Date: {new Date(detail.date).toLocaleDateString()}</span>
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

        <Card className="shadow-lg border-l-4 border-purple-500">
          <CardHeader>
            <CardTitle>Test Function Now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Click below to run the reminder function right now and see if emails would be sent.
            </p>
            <Button
              onClick={testFunctionNow}
              disabled={isTesting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isTesting ? "Testing..." : "⚡ Run Reminder Function Now"}
            </Button>
            
            {testResult && (
              <div className={`p-4 rounded-lg border-2 ${
                testResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-start gap-3">
                  {testResult.success ? 
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" /> :
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  }
                  <div className="flex-1">
                    <p className="font-bold text-lg mb-2">
                      {testResult.success ? 
                        `✅ SUCCESS! Sent ${testResult.emailsSent} email(s)` :
                        `❌ Failed: ${testResult.error}`
                      }
                    </p>
                    {testResult.results && testResult.results.length > 0 && (
                      <div className="space-y-1 text-sm">
                        {testResult.results.map((result, i) => (
                          <div key={i} className="bg-white p-2 rounded">
                            📧 {result.user}: {result.reminders} reminder(s)
                          </div>
                        ))}
                      </div>
                    )}
                    {testResult.emailsSent === 0 && testResult.success && (
                      <p className="text-gray-700 text-sm mt-2">
                        No emails sent because no contracts have dates exactly 1, 3, 5, or 7 days away.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-3">📋 How Reminders Work:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ CRON job runs every day at 8:00 AM</li>
              <li>✅ Checks all active contracts for dates</li>
              <li>✅ Sends reminders if date is <strong>exactly 1, 3, 5, or 7 days away</strong></li>
              <li>✅ Only sends if email notifications enabled & subscription active</li>
              <li>✅ Skips completed items (e.g., if inspection already done)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}