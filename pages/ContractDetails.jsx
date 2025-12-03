
import React, { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, Users, FileText, ExternalLink, Edit2, AlertTriangle, CheckCircle, CheckCircle2, Circle, X, FileDown, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isPast } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import EditContractModal from "../components/contracts/EditContractModal";
import UploadCounterOfferModal from "../components/contracts/UploadCounterOfferModal";
import TransactionChecklist from "../components/contracts/TransactionChecklist";
import AddToCalendarButton from "../components/ui/AddToCalendarButton";

function CancelContractModal({ onCancel, onClose }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleConfirmCancel = () => {
    onCancel(reason, notes);
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to cancel this contract?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Cancelling the contract will update its status and record the reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Select onValueChange={setReason} value={reason} className="col-span-3">
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer_default">Buyer Default</SelectItem>
                <SelectItem value="seller_default">Seller Default</SelectItem>
                <SelectItem value="inspection_contingency">Inspection Contingency</SelectItem>
                <SelectItem value="financing_contingency">Financing Contingency</SelectItem>
                <SelectItem value="appraisal_contingency">Appraisal Contingency</SelectItem>
                <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the cancellation..."
              className="col-span-3"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Keep Contract</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCancel} disabled={!reason} className="bg-red-600 hover:bg-red-700">
            Cancel Contract
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ContractDetailsPage() {
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [relatedContracts, setRelatedContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCounterOfferModalOpen, setIsCounterOfferModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);

  useEffect(() => {
    checkAuthAndLoadContract();
  }, []);

  const checkAuthAndLoadContract = async () => {
    try {
      // Use cached user for faster load
      const cachedUser = sessionStorage.getItem('user_data');
      if (cachedUser) {
        // Assume cached user is valid, proceed
        loadContract();
      } else {
        const userData = await base44.auth.me();
        if (!userData) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        sessionStorage.setItem('user_data', JSON.stringify(userData)); // Cache user data
        loadContract();
      }
    } catch (error) {
      console.error("Auth error:", error);
      sessionStorage.removeItem('user_data'); // Clear potentially stale cache
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const loadContract = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const contractId = urlParams.get("id");
    
    if (!contractId) {
      setIsLoading(false);
      return;
    }

    // Check cache first for immediate rendering
    const cachedData = sessionStorage.getItem('contracts_cache');
    let allContracts = [];
    
    if (cachedData) {
      allContracts = JSON.parse(cachedData);
      const foundContract = allContracts.find(c => c.id === contractId);
      if (foundContract) {
        setContract(foundContract);
        
        const related = allContracts.filter(c => {
          if (foundContract.is_counter_offer && foundContract.original_contract_id) {
            return c.id === foundContract.original_contract_id || 
                   (c.original_contract_id === foundContract.original_contract_id && c.id !== contractId);
          }
          return c.original_contract_id === contractId;
        }).sort((a, b) => (a.counter_offer_number || 0) - (b.counter_offer_number || 0));
        
        setRelatedContracts(related);
        setIsLoading(false); // Set loading to false for fast initial render
      }
    }
    
    // Fetch fresh data in background (or if no cache was hit)
    try {
      const freshContracts = await base44.entities.Contract.list();
      sessionStorage.setItem('contracts_cache', JSON.stringify(freshContracts)); // Update cache
      
      const freshFoundContract = freshContracts.find(c => c.id === contractId);

      if (freshFoundContract) {
        const freshRelated = freshContracts.filter(c => {
          if (freshFoundContract.is_counter_offer && freshFoundContract.original_contract_id) {
            return c.id === freshFoundContract.original_contract_id || 
                   (c.original_contract_id === freshFoundContract.original_contract_id && c.id !== contractId);
          }
          return c.original_contract_id === contractId;
        }).sort((a, b) => (a.counter_offer_number || 0) - (b.counter_offer_number || 0));
        
        // Only update if current state is different from fresh data
        // This avoids unnecessary re-renders if cached data was already up-to-date
        if (JSON.stringify(freshFoundContract) !== JSON.stringify(contract) ||
            JSON.stringify(freshRelated) !== JSON.stringify(relatedContracts)) {
          setContract(freshFoundContract);
          setRelatedContracts(freshRelated);
        }
      } else {
        setContract(null); // Contract not found even after fresh fetch
        setRelatedContracts([]);
      }
    } catch (error) {
      console.error("Error fetching fresh contracts:", error);
      // If fresh fetch fails and no cache was found, we still need to clear loading state
      if (isLoading) {
        setContract(null); // Indicate contract not found due to error
      }
    } finally {
      // Ensure isLoading is false once all data (cached or fresh) is processed
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (updatedData) => {
    await base44.entities.Contract.update(contract.id, updatedData);
    
    // Invalidate cache after update
    sessionStorage.removeItem('contracts_cache');

    if (updatedData.all_parties_signed && contract.is_counter_offer && contract.original_contract_id) {
      await base44.entities.Contract.update(contract.original_contract_id, { status: "superseded" });
      
      // Invalidate cache after update
      sessionStorage.removeItem('contracts_cache');

      const allContracts = await base44.entities.Contract.list(); // Re-fetch to get latest states
      const otherCounters = allContracts.filter(c => 
        c.original_contract_id === contract.original_contract_id && 
        c.id !== contract.id
      );
      
      for (const other of otherCounters) {
        await base44.entities.Contract.update(other.id, { status: "superseded" });
      }
    }
    
    setIsEditOpen(false);
    loadContract(); // Reload data including fresh cache
  };

  const handleCancelContract = async (reason, notes) => {
    await base44.entities.Contract.update(contract.id, {
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_notes: notes,
      cancellation_date: new Date().toISOString()
    });
    // Invalidate cache after update
    sessionStorage.removeItem('contracts_cache');
    setIsCancelModalOpen(false);
    loadContract(); // Reload data including fresh cache
  };

  const handleGenerateTimeline = async (sendToClient = false) => {
    setIsGeneratingTimeline(true);
    try {
      console.log("🔄 Calling generateClientTimeline function...");
      console.log("📦 Contract ID:", contract.id);
      console.log("📧 Send to client:", sendToClient);
      console.log("👤 Client email:", contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email);
      
      const response = await base44.functions.invoke('generateClientTimeline', {
        contractId: contract.id,
        sendToClient: sendToClient
      });

      console.log("✅ Function response:", response);

      if (sendToClient) {
        const clientName = contract.representing_side === 'buyer' ? contract.buyer_name : contract.seller_name;
        alert(`✅ Timeline emailed to ${clientName || 'your client'}!`);
      } else {
        // Download PDF
        const contentType = response.headers?.['content-type'] || 'application/pdf';
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedAddress = (contract.property_address || 'Contract').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        a.download = `Timeline_${sanitizedAddress}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error("❌ Error generating timeline:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error details:", JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.error || error.message || "Unknown error occurred";
      alert(`Error: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    under_contract: "bg-blue-100 text-blue-800",
    inspection: "bg-purple-100 text-purple-800",
    financing: "bg-orange-100 text-orange-800",
    closing: "bg-yellow-100 text-yellow-800",
    closed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    superseded: "bg-gray-200 text-gray-600"
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-gray-600">Contract not found</p>
          <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isSuperseded = contract.status === "superseded";
  const isCancelled = contract.status === "cancelled";
  const activeCounterOffer = relatedContracts.find(c => c.all_parties_signed && c.is_counter_offer);
  const isOriginalContract = !contract.is_counter_offer;
  const hasActiveCounterOffer = isOriginalContract && activeCounterOffer;
  
  const hasDates = (c) => {
    return !!(
      c.closing_date ||
      c.inspection_date ||
      c.inspection_response_date ||
      c.loan_contingency_date ||
      c.appraisal_date ||
      c.final_walkthrough_date
    );
  };
  
  const isCounterOfferUsingOriginalDates = contract.is_counter_offer && 
    contract.all_parties_signed && 
    !hasDates(contract);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{contract.property_address}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={statusColors[contract.status]}>
                {contract.status?.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              {contract.is_counter_offer && (
                <Badge className="bg-purple-100 text-purple-800">
                  Counter Offer #{contract.counter_offer_number}
                </Badge>
              )}
              {contract.all_parties_signed && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Fully Signed
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateTimeline(false)}
                disabled={isGeneratingTimeline}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                {isGeneratingTimeline ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Timeline
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleGenerateTimeline(true)}
                disabled={isGeneratingTimeline || (!contract.buyer_email && !contract.seller_email)}
                className="bg-green-600 hover:bg-green-700 text-white"
                title={(!contract.buyer_email && !contract.seller_email) ? "Add client email to contract first" : ""}
              >
                {isGeneratingTimeline ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Email to Client
                  </>
                )}
              </Button>
            </div>

            {!isCancelled && !isSuperseded && contract.status !== 'closed' && (
              <Button
                onClick={() => setIsCancelModalOpen(true)}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Contract
              </Button>
            )}
            {isOriginalContract && !isCancelled && !isSuperseded && (
              <Button
                onClick={() => setIsCounterOfferModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Counter Offer
              </Button>
            )}
            <Button
              onClick={() => setIsEditOpen(true)}
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Contract
            </Button>
          </div>
        </div>

        {isCancelled && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>This contract has been cancelled.</strong>
              {contract.cancellation_reason && (
                <span className="block mt-1">
                  Reason: {contract.cancellation_reason.replace(/_/g, ' ')}
                </span>
              )}
              {contract.cancellation_notes && (
                <span className="block mt-1 text-sm">
                  Notes: {contract.cancellation_notes}
                </span>
              )}
              {contract.cancellation_date && (
                <span className="block mt-1 text-sm">
                  Cancelled: {format(new Date(contract.cancellation_date), 'MMM d, yyyy')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isSuperseded && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>This contract has been superseded.</strong>
              {activeCounterOffer && (
                <span> Counter Offer #{activeCounterOffer.counter_offer_number} is now the active contract with updated dates.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {contract.is_counter_offer && contract.all_parties_signed && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>This counter offer is the active contract.</strong> 
              {isCounterOfferUsingOriginalDates ? (
                <span> This counter offer has no dates, so all dates below are from the original contract and will appear in your calendar and dashboard.</span>
              ) : (
                <span> All dates below supersede the original contract and will appear in your calendar and dashboard.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {hasActiveCounterOffer && (
          <Alert className="border-purple-200 bg-purple-50">
            <AlertTriangle className="w-5 h-5 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>Counter Offer #{activeCounterOffer.counter_offer_number} is active.</strong> The dates below are for reference only. See the active counter offer for current dates.
            </AlertDescription>
          </Alert>
        )}

        {contract.all_parties_signed && !hasDates(contract) && !isCounterOfferUsingOriginalDates && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Dates verification needed.</strong> This contract is signed but has no key dates recorded. Please edit the contract to add or verify important dates.
            </AlertDescription>
          </Alert>
        )}

        {!isOriginalContract && relatedContracts.length > 0 && ( 
          <Card className="shadow-lg border-l-4 border-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Related Contracts & Counter Offers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {relatedContracts.map((related) => (
                <button
                  key={related.id}
                  onClick={() => {
                    navigate(createPageUrl(`ContractDetails?id=${related.id}`));
                    window.location.reload();
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:border-[#1e3a5f] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {related.is_counter_offer 
                          ? `Counter Offer #${related.counter_offer_number}` 
                          : 'Original Contract'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {related.purchase_price ? `$${related.purchase_price.toLocaleString()}` : '—'} • 
                        {related.contract_date ? format(new Date(related.contract_date), ' MMM d, yyyy') : ' No date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {related.all_parties_signed && (
                        <Badge className="bg-green-100 text-green-800">Signed</Badge>
                      )}
                      <Badge className={statusColors[related.status]}>
                        {related.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {isOriginalContract && (
          <Card className="shadow-lg border-l-4 border-purple-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Counter Offers ({relatedContracts.filter(c => c.is_counter_offer).length})
              </CardTitle>
              {!isCancelled && !isSuperseded && (
                <Button
                  onClick={() => setIsCounterOfferModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Counter Offer
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {relatedContracts.filter(c => c.is_counter_offer).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No counter offers yet</p>
                  <p className="text-sm">Click "Upload Counter Offer" to add one</p>
                </div>
              ) : (
                relatedContracts.filter(c => c.is_counter_offer).map((related) => (
                  <button
                    key={related.id}
                    onClick={() => {
                      navigate(createPageUrl(`ContractDetails?id=${related.id}`));
                      window.location.reload();
                    }}
                    className="w-full text-left p-3 border rounded-lg hover:border-[#1e3a5f] hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Counter Offer #{related.counter_offer_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          {related.purchase_price ? `$${related.purchase_price.toLocaleString()}` : '—'} • 
                          {related.contract_date ? format(new Date(related.contract_date), ' MMM d, yyyy') : ' No date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {related.all_parties_signed && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        <Badge className={statusColors[related.status]}>
                          {related.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {contract.plain_language_summary && (
          <Card className="shadow-lg border-l-4 border-[#c9a961]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-[#c9a961]" />
                Contract Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{contract.plain_language_summary}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1e3a5f]" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Buyer</p>
                <p className="font-semibold text-gray-900">{contract.buyer_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Seller</p>
                <p className="font-semibold text-gray-900">{contract.seller_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">All Parties Signed</p>
                <p className="font-semibold text-gray-900">
                  {contract.all_parties_signed ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Yes {contract.signature_date && `(${format(new Date(contract.signature_date), 'MMM d, yyyy')})`}
                    </span>
                  ) : (
                    <span className="text-gray-500">Pending Signatures</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Purchase Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${contract.purchase_price?.toLocaleString() || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Earnest Money</p>
                <p className="font-semibold text-gray-900">
                  ${contract.earnest_money?.toLocaleString() || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <TransactionChecklist contractId={contract.id} />

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                Important Dates
                {hasActiveCounterOffer && !isCounterOfferUsingOriginalDates && (
                  <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                    Reference Only - See Active Counter Offer
                  </Badge>
                )}
                {contract.is_counter_offer && contract.all_parties_signed && !isCounterOfferUsingOriginalDates && (
                  <Badge className="bg-green-100 text-green-800 ml-2">
                    Active Dates
                  </Badge>
                )}
                {isCounterOfferUsingOriginalDates && (
                  <Badge className="bg-blue-100 text-blue-800 ml-2">
                    Using Original Contract Dates
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-blue-50"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Dates
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { label: "Contract Date", date: contract.contract_date, color: "gray", field: null },
                { label: "Inspection", date: contract.inspection_date, color: "blue", field: "inspection_completed" },
                { label: "Inspection Response", date: contract.inspection_response_date, color: "purple", field: "inspection_response_completed" },
                { label: "Loan Contingency", date: contract.loan_contingency_date, color: "orange", field: "loan_contingency_completed" },
                { label: "Appraisal", date: contract.appraisal_date, color: "green", field: "appraisal_completed" },
                { label: "Final Walkthrough", date: contract.final_walkthrough_date, color: "indigo", field: "final_walkthrough_completed" },
                { label: "Closing Date", date: contract.closing_date, color: "red", field: "closing_completed" }
              ].map(({ label, date, color, field }) => {
                const completed = field ? contract[field] : false;
                const isOverdue = date && isPast(new Date(date)) && !completed && field;
                
                return (
                  <div key={label} className={`flex flex-col gap-3 p-4 rounded-lg transition-all ${
                    completed 
                      ? 'bg-gray-100 opacity-60' 
                      : isOverdue 
                      ? 'bg-red-50 border-2 border-red-300' 
                      : 'bg-gray-50'
                  } ${
                    (hasActiveCounterOffer && !isCounterOfferUsingOriginalDates) || isCancelled || isSuperseded ? 'opacity-50' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : field && isOverdue ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-green-100"
                            onClick={async () => {
                              if (isCancelled || isSuperseded) return;
                              const updates = { [field]: true };
                              if (field === "closing_completed") {
                                updates.status = "closed";
                              }
                              await base44.entities.Contract.update(contract.id, updates);
                              sessionStorage.removeItem('contracts_cache'); // Invalidate cache
                              loadContract();
                            }}
                            title={field === "closing_completed" ? "Mark as closed and archive" : "Mark as complete"}
                            disabled={isCancelled || isSuperseded}
                          >
                            <Circle className="w-5 h-5 text-red-500 hover:text-green-600" />
                          </Button>
                        ) : null}
                        <span className={`font-medium ${completed ? 'text-gray-500 line-through' : isOverdue ? 'text-red-700' : 'text-gray-700'}`}>
                          {label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${completed ? 'text-gray-400' : `text-${color}-600`}`}>
                          {date ? format(new Date(date), "MMM d, yyyy") : "—"}
                        </span>
                        {isOverdue && !completed && (
                          <p className="text-xs text-red-600 font-semibold mt-1">
                            {field === "closing_completed" ? "CLICK TO CLOSE & ARCHIVE" : "OVERDUE"}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {date && !completed && (
                      <AddToCalendarButton
                        event={{
                          title: `${label} - ${contract.property_address}`,
                          date: date,
                          description: `${label} for ${contract.property_address}. Buyer: ${contract.buyer_name || 'N/A'}`,
                          location: contract.property_address
                        }}
                        size="sm"
                        variant="outline"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {contract.agent_notes && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Agent Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{contract.agent_notes}</p>
            </CardContent>
          </Card>
        )}

        {contract.contract_file_url && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <a
                href={contract.contract_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 p-4 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#1e3a5f]" />
                  <div>
                    <p className="font-semibold text-gray-900">View Original Contract</p>
                    <p className="text-sm text-gray-500">Open the uploaded contract document</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      {isEditOpen && (
        <EditContractModal
          contract={contract}
          onSave={handleSaveEdit}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isCounterOfferModalOpen && (
        <UploadCounterOfferModal
          originalContractId={contract.id}
          existingCounterOffers={relatedContracts.filter(c => c.is_counter_offer)}
          onClose={() => setIsCounterOfferModalOpen(false)}
          onSuccess={() => {
            sessionStorage.removeItem('contracts_cache'); // Invalidate cache after new counter offer
            loadContract();
          }}
        />
      )}

      {isCancelModalOpen && (
        <CancelContractModal
          onCancel={(reason, notes) => handleCancelContract(reason, notes)}
          onClose={() => setIsCancelModalOpen(false)}
        />
      )}
    </div>
  );
}
