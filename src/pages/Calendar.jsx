
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AddToCalendarButton from "../components/ui/AddToCalendarButton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CalendarPage() {
  const [contracts, setContracts] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [user, setUser] = useState(null);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  useEffect(() => {
    checkAuthAndLoadContracts();
  }, []);

  const checkAuthAndLoadContracts = async () => {
    try {
      // Use cached user data
      const cachedUser = sessionStorage.getItem('user_data');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
      
      const userData = await base44.auth.me();
      if (!userData) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      
      setUser(userData);
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      
      // Load contracts - ALWAYS fetch fresh, don't use cache
      loadContracts();
    } catch (error) {
      console.error("Auth error:", error);
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const loadContracts = async () => {
    // Clear cache to force fresh load
    sessionStorage.removeItem('contracts_cache');
    sessionStorage.removeItem('contracts_cache_time');
    
    // Fetch fresh data
    const contractData = await base44.entities.Contract.list();
    console.log("📋 Loaded contracts:", contractData); // Debug log
    setContracts(contractData);
    
    // Update cache
    sessionStorage.setItem('contracts_cache', JSON.stringify(contractData));
    sessionStorage.setItem('contracts_cache_time', Date.now().toString());
  };

  const hasDates = (contract) => {
    return !!(
      contract.closing_date ||
      contract.inspection_date ||
      contract.inspection_response_date ||
      contract.loan_contingency_date ||
      contract.appraisal_date ||
      contract.final_walkthrough_date
    );
  };

  const getActiveContracts = () => {
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
            inspection_completed: original.inspection_completed,
            inspection_response_completed: original.inspection_response_completed,
            loan_contingency_completed: original.loan_contingency_completed,
            appraisal_completed: original.appraisal_completed,
            final_walkthrough_completed: original.final_walkthrough_completed,
            _using_original_dates: true
          });
        } else {
          activeContracts.push(signedCounterOffer);
        }
      } else if (original) {
        activeContracts.push(original);
      }
    });

    return activeContracts;
  };

  const getAllDates = () => {
    const dates = [];
    const activeContracts = getActiveContracts();
    
    // Contract dates
    activeContracts.forEach(contract => {
      const dateTypes = [
        { date: contract.inspection_date, type: "Inspection", color: "blue", completed: contract.inspection_completed },
        { date: contract.inspection_response_date, type: "Inspection Response", color: "purple", completed: contract.inspection_response_completed },
        { date: contract.loan_contingency_date, type: "Loan Contingency", color: "orange", completed: contract.loan_contingency_completed },
        { date: contract.appraisal_date, type: "Appraisal", color: "green", completed: contract.appraisal_completed },
        { date: contract.final_walkthrough_date, type: "Final Walkthrough", color: "indigo", completed: contract.final_walkthrough_completed },
        { date: contract.closing_date, type: "Closing", color: "red", completed: false }
      ];

      dateTypes.forEach(({ date, type, color, completed }) => {
        if (date) {
          dates.push({
            date: new Date(date),
            type,
            color,
            property: contract.property_address,
            contractId: contract.id,
            isFromCounterOffer: contract.is_counter_offer,
            counterOfferNumber: contract.counter_offer_number,
            usingOriginalDates: contract._using_original_dates,
            completed
          });
        }
      });
    });

    return dates;
  };

  const getEmailableContracts = () => {
    const activeContracts = getActiveContracts();
    
    // Filter to only contracts with dates, not closed/cancelled/superseded, and have VALID client email
    const emailable = activeContracts.filter(c => {
      if (c.closing_completed) return false;
      if (["cancelled", "superseded"].includes(c.status)) return false;
      if (!hasDates(c)) return false;
      
      // CRITICAL: Check that email exists AND is valid
      const clientEmail = c.representing_side === 'buyer' ? c.buyer_email : c.seller_email;
      
      // Email must exist, not be empty, and be a valid format
      if (!clientEmail || clientEmail.trim() === '') return false;
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) return false;
      
      return true;
    });

    // Sort by client last name, then by address
    return emailable.sort((a, b) => {
      const aName = a.representing_side === 'buyer' ? a.buyer_name : a.seller_name;
      const bName = b.representing_side === 'buyer' ? b.buyer_name : b.seller_name;
      
      const aLastName = aName?.split(' ').pop() || a.property_address;
      const bLastName = bName?.split(' ').pop() || b.property_address;
      
      return aLastName.localeCompare(bLastName);
    });
  };

  const handleBulkEmail = async () => {
    if (selectedContracts.size === 0) return;
    
    setIsSending(true);
    const results = { success: [], failed: [] };
    
    // Refresh contracts before sending to ensure we have latest data
    await loadContracts();
    
    for (const contractId of selectedContracts) {
      try {
        const contract = contracts.find(c => c.id === contractId);
        console.log("📧 Attempting to send to contract:", contract); // Debug log
        
        const clientEmail = contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email;
        const clientName = contract.representing_side === 'buyer' ? contract.buyer_name : contract.seller_name;
        
        console.log("📧 Client email:", clientEmail, "Name:", clientName); // Debug log
        
        // Validate email exists before trying to send
        if (!clientEmail || clientEmail.trim() === '') {
          results.failed.push({
            address: contract.property_address,
            clientName: clientName || 'Unknown',
            reason: `No email address found. Please add ${contract.representing_side === 'buyer' ? 'buyer' : 'seller'} email to contract.`
          });
          console.error("❌ No email for contract:", contract.property_address);
          continue;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clientEmail)) {
          results.failed.push({
            address: contract.property_address,
            clientName: clientName || 'Unknown',
            reason: `Invalid email format: ${clientEmail}`
          });
          console.error("❌ Invalid email format:", clientEmail);
          continue;
        }
        
        console.log("✅ Sending to:", clientEmail);
        
        const response = await base44.functions.invoke('generateClientTimeline', {
          contractId,
          sendToClient: true
        });
        
        console.log("✅ Send response:", response);
        
        results.success.push({
          name: clientName || contract.property_address,
          email: clientEmail
        });
        
      } catch (error) {
        console.error(`❌ Failed to send timeline email to ${contractId}:`, error);
        const contract = contracts.find(c => c.id === contractId);
        const clientEmail = contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email;
        
        results.failed.push({
          address: contract.property_address,
          clientName: contract.representing_side === 'buyer' ? contract.buyer_name : contract.seller_name,
          reason: error.response?.data?.error || error.message || 'Unknown error',
          attemptedEmail: clientEmail || 'No email found'
        });
      }
    }
    
    setSendResults(results);
    setIsSending(false);
    setSelectedContracts(new Set());
  };

  const toggleContract = (contractId) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId);
    } else {
      newSelected.add(contractId);
    }
    setSelectedContracts(newSelected);
  };

  const selectAll = () => {
    const emailable = getEmailableContracts();
    setSelectedContracts(new Set(emailable.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedContracts(new Set());
  };

  const allDates = getAllDates();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDatesForDay = (day) => {
    return allDates.filter(d => isSameDay(d.date, day));
  };

  const colorMap = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    green: "bg-green-500",
    indigo: "bg-indigo-500",
    red: "bg-red-500"
  };

  const legendItems = [
    { color: "blue", label: "Inspection", bgClass: "bg-blue-500" },
    { color: "purple", label: "Inspection Response", bgClass: "bg-purple-500" },
    { color: "orange", label: "Loan Contingency", bgClass: "bg-orange-500" },
    { color: "green", label: "Appraisal", bgClass: "bg-green-500" },
    { color: "indigo", label: "Final Walkthrough", bgClass: "bg-indigo-500" },
    { color: "red", label: "Closing", bgClass: "bg-red-500" }
  ];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const emailableContracts = getEmailableContracts();

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">📅 Contract Calendar</h1>
            <p className="text-gray-600">
              {user?.organization_role === 'team_lead' 
                ? 'All team contracts and dates' 
                : 'All important dates from your contracts'}
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {/* BULK EMAIL BUTTON */}
            <Button
              onClick={() => setShowBulkEmailModal(true)}
              disabled={emailableContracts.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Send className="w-4 h-4 mr-2" />
              Email Timelines ({emailableContracts.length})
            </Button>

            {/* BULK EXPORT BUTTON */}
            <AddToCalendarButton
              events={allDates.filter(d => !d.completed).map(d => ({
                title: `${d.type} - ${d.property}`,
                date: d.date,
                description: `${d.type} for ${d.property}`,
                location: d.property
              }))}
              size="default"
              variant="default"
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            />
          </div>
        </div>

        {/* BULK EMAIL MODAL */}
        <Dialog open={showBulkEmailModal} onOpenChange={setShowBulkEmailModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">📧 Email Client Timelines</DialogTitle>
              <DialogDescription>
                Select which clients should receive their transaction timeline PDF
              </DialogDescription>
            </DialogHeader>

            {sendResults ? (
              <div className="space-y-4">
                {sendResults.success.length > 0 && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>✅ Successfully sent to {sendResults.success.length}:</strong>
                      <ul className="mt-2 ml-4 list-disc text-sm">
                        {sendResults.success.map((item, idx) => (
                          <li key={idx}>
                            <strong>{item.name}</strong> &rarr; {item.email}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {sendResults.failed.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>❌ Failed to send to {sendResults.failed.length}:</strong>
                      <ul className="mt-2 ml-4 list-disc text-sm space-y-2">
                        {sendResults.failed.map((item, idx) => (
                          <li key={idx}>
                            <div className="font-semibold">{item.address}</div>
                            <div className="text-xs mt-1">
                              Client: {item.clientName}<br />
                              {item.attemptedEmail && `Email: ${item.attemptedEmail}`}<br />
                              Reason: {item.reason}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 p-3 bg-white/50 rounded border border-red-200">
                        <p className="text-sm font-semibold mb-2">💡 How to fix:</p>
                        <ol className="text-xs space-y-1 ml-4 list-decimal">
                          <li>Click on the contract from Dashboard or Calendar</li>
                          <li>Click "Edit Contract"</li>
                          <li>Add the {contracts.find(c => sendResults.failed.some(f => f.address === c.property_address))?.representing_side === 'buyer' ? 'Buyer' : 'Seller'} Email</li>
                          <li>Save and try again</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={() => {
                  setSendResults(null);
                  setShowBulkEmailModal(false);
                  loadContracts(); // Refresh on close
                }} className="w-full">
                  Close
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                  <div className="text-sm text-gray-600">
                    {selectedContracts.size} of {emailableContracts.length} selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
                  {emailableContracts.map((contract) => {
                    const clientName = contract.representing_side === 'buyer' ? contract.buyer_name : contract.seller_name;
                    const clientEmail = contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email;
                    
                    return (
                      <div
                        key={contract.id}
                        onClick={() => toggleContract(contract.id)}
                        className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedContracts.has(contract.id)}
                          onCheckedChange={() => toggleContract(contract.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{clientName}</p>
                          <p className="text-sm text-gray-600">{contract.property_address}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            📧 {clientEmail}
                            {contract.closing_date && ` • Closing: ${format(new Date(contract.closing_date), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkEmailModal(false)}
                    disabled={isSending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkEmail}
                    disabled={selectedContracts.size === 0 || isSending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending to {selectedContracts.size}...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send to {selectedContracts.size} {selectedContracts.size === 1 ? 'Client' : 'Clients'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Color Legend */}
        <Card className="shadow-lg border-l-4 border-[#1e3a5f]">
          <CardHeader>
            <CardTitle className="text-lg">Color Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {legendItems.map((item) => (
                <div key={item.color} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${item.bgClass}`} />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-300 opacity-40" />
                  <span>Completed (faded)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500 ring-2 ring-blue-400" />
                  <span>Using original contract dates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500 ring-2 ring-yellow-400" />
                  <span>From counter offer</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentMonth(new Date())}
                  className="hidden md:block"
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
              
              {daysInMonth.map(day => {
                const dayDates = getDatesForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toString()}
                    className={`min-h-24 p-2 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                      isToday ? "border-[#1e3a5f] bg-blue-50 ring-2 ring-blue-200" : "border-gray-200"
                    } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={`text-sm font-semibold mb-1 ${
                      isToday ? "text-[#1e3a5f]" : "text-gray-700"
                    }`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayDates.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-1 py-0.5 rounded ${colorMap[event.color]} text-white truncate ${
                            event.completed ? 'opacity-40 line-through' : ''
                          } ${
                            event.usingOriginalDates ? 'ring-2 ring-blue-400' : event.isFromCounterOffer ? 'ring-2 ring-yellow-400' : ''
                          }`}
                          title={
                            event.completed 
                              ? `${event.type} - COMPLETED` 
                              : event.usingOriginalDates 
                              ? `Counter Offer #${event.counterOfferNumber} (using original contract dates)` 
                              : event.isFromCounterOffer 
                              ? `From Counter Offer #${event.counterOfferNumber}` 
                              : 'From Original Contract'
                          }
                        >
                          {event.type}
                        </div>
                      ))}
                      {dayDates.length > 2 && (
                        <div className="text-xs text-gray-500 font-semibold">
                          +{dayDates.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="shadow-lg border-l-4 border-[#1e3a5f]">
            <CardHeader className="border-b bg-blue-50">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {getDatesForDay(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getDatesForDay(selectedDate).map((event, idx) => (
                      <Link
                        key={idx}
                        to={createPageUrl(`ContractDetails?id=${event.contractId}`)}
                        className="block"
                      >
                        <div className="p-4 border border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className={`${colorMap[event.color]} ${event.completed ? 'opacity-40 line-through' : ''}`}>
                                  {event.type} {event.completed && '(Completed)'}
                                </Badge>
                                {event.usingOriginalDates ? (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    Counter Offer #{event.counterOfferNumber} (Original Dates)
                                  </Badge>
                                ) : event.isFromCounterOffer ? (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    Counter Offer #{event.counterOfferNumber}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="font-semibold text-gray-900 text-lg">{event.property}</p>
                              <p className="text-sm text-gray-500 mt-1">Click to view contract details</p>
                            </div>
                          </div>
                          <div onClick={(e) => e.preventDefault()}>
                            <AddToCalendarButton
                              event={{
                                title: `${event.type} - ${event.property}`,
                                date: event.date,
                                description: `${event.type} for ${event.property}`,
                                location: event.property
                              }}
                            />
                          </div>
                        </div>
                      </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No events on this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
