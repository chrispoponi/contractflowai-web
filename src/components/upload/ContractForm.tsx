import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, X, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";

type ContractFormData = {
  property_address?: string;
  representing_side?: string;
  status?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  seller_name?: string;
  seller_email?: string;
  seller_phone?: string;
  purchase_price?: number | string;
  earnest_money?: number | string;
  contract_date?: string;
  closing_date?: string;
  inspection_date?: string;
  inspection_response_date?: string;
  loan_contingency_date?: string;
  appraisal_date?: string;
  final_walkthrough_date?: string;
  plain_language_summary?: string;
  agent_notes?: string;
  _uncertain_fields?: string[];
};

type ContractFormProps = {
  initialData?: ContractFormData;
  onSave: (data: ContractFormData) => void;
  onCancel: () => void;
};

type DateField = {
  key: keyof ContractFormData;
  label: string;
};

export default function ContractForm({ initialData, onSave, onCancel }: ContractFormProps) {
  const [formData, setFormData] = useState<ContractFormData>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  
  // Track uncertain fields - starts from AI extraction, cleared when user edits
  const [uncertainFields, setUncertainFields] = useState<string[]>(initialData?._uncertain_fields || []);
  
  // Track which fields user has manually verified/edited
  const [verifiedFields, setVerifiedFields] = useState<string[]>([]);
  
  // Define all date fields for checking
  const dateFields: DateField[] = [
    { key: 'contract_date', label: 'Contract Date' },
    { key: 'closing_date', label: 'Closing Date' },
    { key: 'inspection_date', label: 'Inspection Date' },
    { key: 'inspection_response_date', label: 'Inspection Response Date' },
    { key: 'loan_contingency_date', label: 'Loan Contingency Date' },
    { key: 'appraisal_date', label: 'Appraisal Date' },
    { key: 'final_walkthrough_date', label: 'Final Walkthrough Date' }
  ];
  
  // Check which dates are missing (not verified by user)
  const getMissingOrUncertainDates = () => {
    return dateFields.filter(({ key }) => 
      !formData[key] || (uncertainFields.includes(key as string) && !verifiedFields.includes(key as string))
    );
  };
  
  // Check if a field needs attention (missing or uncertain and not yet verified by user)
  const needsAttention = (fieldKey: string): boolean => {
    if (verifiedFields.includes(fieldKey)) return false;
    return !formData[fieldKey as keyof ContractFormData] || uncertainFields.includes(fieldKey);
  };
  
  // Check if a field was marked as uncertain by AI (and not yet verified)
  const isUncertain = (fieldKey: string): boolean => {
    if (verifiedFields.includes(fieldKey)) return false;
    return uncertainFields.includes(fieldKey);
  };

  const handleChange = (field: keyof ContractFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // When user edits a date field, mark it as verified (user has reviewed it)
    const dateFieldKeys = dateFields.map(d => d.key as string);
    if (dateFieldKeys.includes(field as string) && value) {
      // Remove from uncertain and add to verified
      setUncertainFields(prev => prev.filter(f => f !== field));
      setVerifiedFields(prev => prev.includes(field as string) ? prev : [...prev, field as string]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};
    
    if (!formData.property_address) {
      newErrors.property_address = "Property address is required";
    }
    
    if (!formData.representing_side) {
      newErrors.representing_side = "Please select which side you represent";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Check if there are uncertain or missing dates that need confirmation
      const problemDates = getMissingOrUncertainDates();
      if (problemDates.length > 0) {
        setShowDateConfirmation(true);
      } else {
        onSave(formData);
      }
    }
  };
  
  const handleConfirmSave = () => {
    setShowDateConfirmation(false);
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle>Contract Details</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Review and edit the extracted information
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Please fix the errors below before saving
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="property_address">Property Address *</Label>
              <Input
                id="property_address"
                value={formData.property_address || ""}
                onChange={(e) => handleChange("property_address", e.target.value)}
                className={errors.property_address ? "border-red-500" : ""}
              />
              {errors.property_address && (
                <p className="text-sm text-red-600 mt-1">{errors.property_address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="representing_side">Representing *</Label>
              <Select
                value={formData.representing_side || "buyer"}
                onValueChange={(value) => handleChange("representing_side", value)}
              >
                <SelectTrigger className={errors.representing_side ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
              {errors.representing_side && (
                <p className="text-sm text-red-600 mt-1">{errors.representing_side}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Buyer Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyer_name">Buyer Name</Label>
                <Input
                  id="buyer_name"
                  value={formData.buyer_name || ""}
                  onChange={(e) => handleChange("buyer_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="buyer_email">Buyer Email</Label>
                <Input
                  id="buyer_email"
                  type="email"
                  value={formData.buyer_email || ""}
                  onChange={(e) => handleChange("buyer_email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="buyer_phone">Buyer Phone</Label>
                <Input
                  id="buyer_phone"
                  value={formData.buyer_phone || ""}
                  onChange={(e) => handleChange("buyer_phone", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Seller Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seller_name">Seller Name</Label>
                <Input
                  id="seller_name"
                  value={formData.seller_name || ""}
                  onChange={(e) => handleChange("seller_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seller_email">Seller Email</Label>
                <Input
                  id="seller_email"
                  type="email"
                  value={formData.seller_email || ""}
                  onChange={(e) => handleChange("seller_email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seller_phone">Seller Phone</Label>
                <Input
                  id="seller_phone"
                  value={formData.seller_phone || ""}
                  onChange={(e) => handleChange("seller_phone", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Financial Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price || ""}
                  onChange={(e) => handleChange("purchase_price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="earnest_money">Earnest Money</Label>
                <Input
                  id="earnest_money"
                  type="number"
                  value={formData.earnest_money || ""}
                  onChange={(e) => handleChange("earnest_money", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                Important Dates
              </h3>
              {getMissingOrUncertainDates().length > 0 && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {getMissingOrUncertainDates().length} date(s) need verification
                </span>
              )}
            </div>
            
            {/* Alert for uncertain/missing dates */}
            {getMissingOrUncertainDates().length > 0 && (
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Please verify highlighted dates:</strong> Some dates could not be confidently extracted from the PDF. 
                  Fields marked with a yellow border need your attention.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              {dateFields.map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={key as string} className="flex items-center gap-2">
                    {label}
                    {isUncertain(key as string) && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Needs verification
                      </span>
                    )}
                    {formData[key] && !isUncertain(key as string) && (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    )}
                  </Label>
                  <Input
                    id={key as string}
                    type="date"
                    value={(formData[key] as string) || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={needsAttention(key as string) ? "border-amber-400 bg-amber-50 focus:border-amber-500" : ""}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="plain_language_summary">Summary</Label>
                <Textarea
                  id="plain_language_summary"
                  rows={3}
                  value={formData.plain_language_summary || ""}
                  onChange={(e) => handleChange("plain_language_summary", e.target.value)}
                  placeholder="Brief summary of the contract..."
                />
              </div>
              <div>
                <Label htmlFor="agent_notes">Agent Notes</Label>
                <Textarea
                  id="agent_notes"
                  rows={3}
                  value={formData.agent_notes || ""}
                  onChange={(e) => handleChange("agent_notes", e.target.value)}
                  placeholder="Private notes about this contract..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              <Save className="w-4 h-4 mr-2" />
              Save Contract
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Date Confirmation Dialog */}
      {showDateConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full shadow-2xl">
            <CardHeader className="border-b bg-amber-50">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                Verify Dates Before Saving
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700">
                The following dates need your attention. They were either not found in the PDF or couldn't be confidently extracted:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {getMissingOrUncertainDates().map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className={`text-sm ${formData[key] ? 'text-amber-600' : 'text-red-600'}`}>
                      {formData[key] ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {formData[key] as string} (unverified)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Not set
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Calendar className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Tip:</strong> After saving, you can add all dates to your calendar from the Contract Details page.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDateConfirmation(false)}
                  className="flex-1"
                >
                  Go Back & Edit Dates
                </Button>
                <Button 
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Anyway
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  );
}
