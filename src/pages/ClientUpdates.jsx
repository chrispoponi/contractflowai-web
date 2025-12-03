
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, Loader2, Calendar, Mail } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentProfile, redirectToLogin } from "@/lib/supabaseAuth";
import { supabaseEntities } from "@/lib/supabaseEntities";
import { invokeFunction } from "@/lib/supabaseFunctions";

export default function ClientUpdatesPage() {
  const [contracts, setContracts] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [sendingIds, setSendingIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const userData = await getCurrentProfile();
      if (!userData) {
        redirectToLogin(window.location.pathname);
        return;
      }
      setUser(userData);
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      redirectToLogin(window.location.pathname);
    }
  };

  const loadData = async () => {
    try {
      const [contractData, updateData] = await Promise.all([
        supabaseEntities.Contract.list(),
        supabaseEntities.ClientUpdate.list("-sent_date")
      ]);
      setContracts(contractData);
      setUpdates(updateData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error loading contracts");
    }
  };

  // Get all upcoming dates from active contracts where agent represents buyer
  const getUpcomingDates = () => {
    const dates = [];
    const activeContracts = contracts.filter(c => 
      c.status !== 'closed' && 
      c.status !== 'cancelled' &&
      c.representing_side === 'buyer' && // ONLY if agent represents buyer
      c.buyer_email // Must have buyer email
    );

    activeContracts.forEach(contract => {
      const dateTypes = [
        { 
          date: contract.inspection_date, 
          type: "inspection_scheduled",
          label: "Inspection",
          completed: contract.inspection_completed 
        },
        { 
          date: contract.inspection_response_date, 
          type: "inspection_response",
          label: "Inspection Response Due",
          completed: contract.inspection_response_completed 
        },
        { 
          date: contract.appraisal_date, 
          type: "appraisal_scheduled",
          label: "Appraisal",
          completed: contract.appraisal_completed 
        },
        { 
          date: contract.loan_contingency_date, 
          type: "loan_contingency",
          label: "Loan Contingency",
          completed: contract.loan_contingency_completed 
        },
        { 
          date: contract.final_walkthrough_date, 
          type: "final_walkthrough",
          label: "Final Walkthrough",
          completed: contract.final_walkthrough_completed 
        },
        { 
          date: contract.closing_date, 
          type: "closing",
          label: "Closing",
          completed: contract.closing_completed 
        }
      ];

      dateTypes.forEach(({ date, type, label, completed }) => {
        if (date && !completed) {
          const daysUntil = differenceInDays(new Date(date), new Date());
          
          // Show dates within next 14 days or overdue
          if (daysUntil <= 14) {
            // Check if we already sent an update for this date
            const alreadySent = updates.some(u => 
              u.contract_id === contract.id && 
              u.update_type === type &&
              u.is_sent
            );

            dates.push({
              id: `${contract.id}-${type}`,
              contract_id: contract.id,
              contract,
              date,
              type,
              label,
              daysUntil,
              alreadySent,
              isOverdue: daysUntil < 0
            });
          }
        }
      });
    });

    // Sort by date (soonest first)
    return dates.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const generateEmailContent = (dateInfo) => {
    const { contract, label, date, type } = dateInfo;
    const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');
    const buyerFirstName = contract.buyer_name?.split(' ')[0] || 'there';

    const templates = {
      inspection_scheduled: {
        subject: `Upcoming Inspection - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Just a friendly reminder that your home inspection is coming up:

📅 Date: ${formattedDate}
📍 Property: ${contract.property_address}

I'll send you the inspector's contact information shortly. Please make sure all utilities are on and the property is accessible.

After the inspection, we'll review the report together and discuss any findings.

Looking forward to moving this forward!`
      },
      inspection_response: {
        subject: `Inspection Response Deadline - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Quick reminder - your inspection response deadline is coming up on ${formattedDate}.

📍 Property: ${contract.property_address}

Have you had a chance to review the inspection report? Let's schedule a call to discuss any concerns and next steps.

I'm here to help guide you through this!`
      },
      appraisal_scheduled: {
        subject: `Appraisal Coming Up - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your appraisal is scheduled for ${formattedDate}.

📍 Property: ${contract.property_address}
💰 Purchase Price: $${contract.purchase_price?.toLocaleString()}

The appraiser will assess the property to ensure it supports the purchase price. I'll keep you updated on the results.

Everything is on track!`
      },
      loan_contingency: {
        subject: `Loan Contingency Deadline - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your loan contingency deadline is ${formattedDate}.

📍 Property: ${contract.property_address}

How is the loan process going? Let me know if you need me to follow up with your lender or if there's anything I can help with.

We're almost there!`
      },
      final_walkthrough: {
        subject: `Final Walkthrough Scheduled - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your final walkthrough is scheduled for ${formattedDate}!

📍 Property: ${contract.property_address}

This is your chance to verify the property is in the agreed-upon condition before closing. I'll meet you there and we'll do a thorough walk-through together.

Almost time to get your keys!`
      },
      closing: {
        subject: `Closing Day Approaching! - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

The big day is almost here! Your closing is scheduled for ${formattedDate}.

📍 Property: ${contract.property_address}
💰 Purchase Price: $${contract.purchase_price?.toLocaleString()}

I'll send you the closing location and time details soon. Make sure to bring a valid ID and your certified funds.

Congratulations - you're about to be a homeowner!`
      }
    };

    return templates[type] || {
      subject: `Update on ${contract.property_address}`,
      body: `Hi ${buyerFirstName}!\n\n${label} is scheduled for ${formattedDate}.\n\nProperty: ${contract.property_address}\n\nI'll keep you updated!`
    };
  };

  const handleSendUpdate = async (dateInfo) => {
    setSendingIds(prev => new Set([...prev, dateInfo.id]));
    setError(null);
    setSuccess(null);

    try {
      const { subject, body } = generateEmailContent(dateInfo);
      
      const emailBody = `${body}

---
${dateInfo.contract.closing_date ? `Expected Closing: ${format(parseISO(dateInfo.contract.closing_date), 'MMMM d, yyyy')}` : ''}

Questions? Just reply to this email.

Best regards,
${user.full_name}
${user.brokerage_name || ''}

---
Sent from ContractFlowAI`;

      // Send email via Supabase Edge Function
      await invokeFunction('sendClientEmail', {
        from_name: user.full_name,
        to: dateInfo.contract.buyer_email,
        subject,
        body: emailBody
      });

      // Save update record
      await supabaseEntities.ClientUpdate.create({
        contract_id: dateInfo.contract_id,
        client_email: dateInfo.contract.buyer_email,
        client_phone: dateInfo.contract.buyer_phone || "",
        update_type: dateInfo.type,
        message: body,
        send_method: "email",
        sent_date: new Date().toISOString(),
        is_sent: true
      });

      setSuccess(`✅ Email sent to ${dateInfo.contract.buyer_name}!`);
      loadData();
      
    } catch (err) {
      console.error("Error sending update:", err);
      setError(`❌ Error: ${err.message}`);
    }

    setSendingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(dateInfo.id);
      return newSet;
    });
  };

  const upcomingDates = getUpcomingDates();
  const sellerSideContracts = contracts.filter(c => c.representing_side === 'seller' && c.status !== 'closed' && c.status !== 'cancelled').length;


  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Client Updates</h1>
          <p className="text-gray-600">Automatically send reminders to your buyer clients for upcoming dates</p>
        </div>

        {sellerSideContracts > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              <strong>Note:</strong> You have {sellerSideContracts} listing{sellerSideContracts !== 1 ? 's' : ''} where you represent the seller. 
              Automated reminders are only sent to buyer clients. Seller updates are typically handled by the buyer's agent.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              Buyer Clients - Ready to Send ({upcomingDates.filter(d => !d.alreadySent).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {upcomingDates.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No upcoming dates for buyer clients in the next 14 days</p>
                <p className="text-gray-400 text-sm mt-2">
                  {sellerSideContracts > 0 
                    ? "Seller-side contracts don't get automated buyer reminders" 
                    : "Contract dates will appear here when they're within 2 weeks"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDates.map(dateInfo => (
                  <div 
                    key={dateInfo.id}
                    className={`p-5 border-2 rounded-lg transition-all ${
                      dateInfo.isOverdue 
                        ? 'border-red-300 bg-red-50' 
                        : dateInfo.alreadySent
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`${
                            dateInfo.isOverdue ? 'bg-red-600' : 'bg-blue-600'
                          } text-white`}>
                            {dateInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            {dateInfo.daysUntil === 0 ? 'TODAY' : 
                             dateInfo.daysUntil === 1 ? 'Tomorrow' :
                             dateInfo.isOverdue ? `${Math.abs(dateInfo.daysUntil)}d overdue` :
                             `${dateInfo.daysUntil} days`}
                          </Badge>
                          {dateInfo.alreadySent && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Already Sent
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {dateInfo.contract.property_address}
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          <div>
                            <strong>Client:</strong> {dateInfo.contract.buyer_name}
                          </div>
                          <div>
                            <strong>Email:</strong> {dateInfo.contract.buyer_email}
                          </div>
                          <div>
                            <strong>Date:</strong> {format(parseISO(dateInfo.date), 'MMM d, yyyy')}
                          </div>
                          <div>
                            <strong>Price:</strong> ${dateInfo.contract.purchase_price?.toLocaleString()}
                          </div>
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                            Preview Email →
                          </summary>
                          <div className="mt-3 p-4 bg-gray-50 rounded border border-gray-200">
                            <p className="font-semibold mb-2">
                              Subject: {generateEmailContent(dateInfo).subject}
                            </p>
                            <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans">
                              {generateEmailContent(dateInfo).body}
                            </pre>
                          </div>
                        </details>
                      </div>

                      <div className="flex-shrink-0">
                        {dateInfo.alreadySent ? (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Sent</p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleSendUpdate(dateInfo)}
                            disabled={sendingIds.has(dateInfo.id)}
                            className={`${
                              dateInfo.isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            } text-white min-w-[120px]`}
                          >
                            {sendingIds.has(dateInfo.id) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Email
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>Recent Updates ({updates.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {updates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No updates sent yet</p>
            ) : (
              <div className="space-y-2">
                {updates.slice(0, 10).map(update => {
                  const contract = contracts.find(c => c.id === update.contract_id);
                  return (
                    <div key={update.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {contract?.property_address || 'Contract'}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {update.client_email} • {update.update_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <CheckCircle className="w-4 h-4 text-green-600 inline mr-2" />
                        <span className="text-sm text-gray-500">
                          {format(parseISO(update.sent_date), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
