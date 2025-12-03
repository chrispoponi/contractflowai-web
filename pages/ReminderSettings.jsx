
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Save, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const eventTypes = [
  {
    key: "inspection",
    label: "Inspection",
    color: "bg-blue-500",
    field: "reminder_inspection_days"
  },
  {
    key: "inspection_response",
    label: "Inspection Response",
    color: "bg-purple-500",
    field: "reminder_inspection_response_days"
  },
  {
    key: "loan_contingency",
    label: "Loan Contingency",
    color: "bg-orange-500",
    field: "reminder_loan_contingency_days"
  },
  {
    key: "appraisal",
    label: "Appraisal",
    color: "bg-green-500",
    field: "reminder_appraisal_days"
  },
  {
    key: "final_walkthrough",
    label: "Final Walkthrough",
    color: "bg-indigo-500",
    field: "reminder_final_walkthrough_days"
  },
  {
    key: "closing",
    label: "Closing",
    color: "bg-red-500",
    field: "reminder_closing_days"
  }
];

const availableDays = [1, 3, 5, 7];

export default function ReminderSettingsPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    checkAuthAndLoadSettings();
  }, []);

  const checkAuthAndLoadSettings = async () => {
    try {
      const userData = await User.me();
      if (!userData) {
        User.redirectToLogin(window.location.pathname);
        return;
      }
      loadSettings(userData); // Pass userData directly to avoid re-fetching
    } catch (error) {
      console.error("Auth error:", error);
      User.redirectToLogin(window.location.pathname);
    }
  };

  const loadSettings = async (initialUserData = null) => {
    try {
      const userData = initialUserData || await User.me(); // Use initialUserData if provided, else fetch again
      setUser(userData);
      
      const reminderSettings = {};
      eventTypes.forEach(event => {
        // Filter out any '2' days that might have been saved previously,
        // as '2' is no longer an available option.
        const currentDays = (userData[event.field] || []).filter(day => availableDays.includes(day));
        reminderSettings[event.field] = currentDays;
      });
      
      setSettings(reminderSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
  };

  const toggleDay = (field, day) => {
    const current = settings[field] || [];
    if (current.includes(day)) {
      setSettings(prev => ({
        ...prev,
        [field]: current.filter(d => d !== day)
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: [...current, day].sort((a, b) => a - b)
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Ensure that only valid days (from availableDays) are saved
      const settingsToSave = {};
      for (const field in settings) {
        settingsToSave[field] = settings[field].filter(day => availableDays.includes(day));
      }
      await User.updateMyUserData(settingsToSave);
      setSettings(settingsToSave); // Update local state with potentially filtered days
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            📧 Reminder Settings
          </h1>
          <p className="text-gray-600">Set custom reminder timelines for each contract event type</p>
        </div>

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Settings saved successfully! Your custom reminder timelines are now active.
            </AlertDescription>
          </Alert>
        )}

        {/* NEW: Universal Settings Notice */}
        <Card className="shadow-lg border-l-4 border-green-500 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  🌐 Universal Settings - Apply to ALL Contracts
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  These reminder timelines will automatically apply to <strong>every contract</strong> you upload - past, present, and future.
                </p>
                <p className="text-xs text-gray-600">
                  Example: If you set "Inspection: 7 days, 3 days, 1 day" → you'll get reminders 7, 3, and 1 days before EVERY inspection across ALL your contracts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-blue-500">
          <CardHeader className="border-b bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-5 h-5 text-[#1e3a5f]" />
              Custom Reminder Timelines
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Click bubbles to toggle reminder days for each event type. These settings apply to ALL your contracts.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {eventTypes.map((event) => {
              const reminderDays = settings[event.field] || [];

              return (
                <div key={event.key} className="border rounded-lg p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-4 h-4 rounded-full ${event.color}`} />
                    <h3 className="text-lg font-semibold text-gray-900">{event.label}</h3>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {reminderDays.length > 0 
                        ? `Reminders set for: ${reminderDays.join(', ')} ${reminderDays.length === 1 ? 'day' : 'days'} before`
                        : 'No reminders set - click bubbles below to add'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {availableDays.map((day) => {
                        const isActive = reminderDays.includes(day);
                        return (
                          <button
                            key={day}
                            onClick={() => toggleDay(event.field, day)}
                            className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 ${
                              isActive
                                ? `${event.color} text-white shadow-lg transform scale-105 ring-2 ring-offset-2 ${event.color.replace('bg-', 'ring-')}`
                                : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            {isActive && <CheckCircle className="w-4 h-4 inline mr-1" />}
                            {day} {day === 1 ? 'day' : 'days'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-6 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] px-8"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">📬 How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Click bubbles to toggle:</strong> Active reminders show in color with a checkmark
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Universal Settings:</strong> These timelines apply to ALL contracts with that event type
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Example:</strong> Toggle "7", "3", "1" for Inspection → get reminders 7, 3, and 1 days before EVERY inspection
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Automatic:</strong> System checks daily at midnight and sends emails based on these settings
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Smart Filtering:</strong> Only sends reminders for incomplete events (completed items are skipped)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
