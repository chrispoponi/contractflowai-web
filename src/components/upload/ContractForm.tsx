import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, X } from "lucide-react";

export default function ContractForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData || {});
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.property_address) {
      newErrors.property_address = "Property address is required";
    }
    
    if (!formData.representing_side) {
      newErrors.representing_side = "Please select which side you represent";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
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
            <h3 className="font-semibold text-gray-900 mb-4">Important Dates</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contract_date">Contract Date</Label>
                <Input
                  id="contract_date"
                  type="date"
                  value={formData.contract_date || ""}
                  onChange={(e) => handleChange("contract_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="closing_date">Closing Date</Label>
                <Input
                  id="closing_date"
                  type="date"
                  value={formData.closing_date || ""}
                  onChange={(e) => handleChange("closing_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inspection_date">Inspection Date</Label>
                <Input
                  id="inspection_date"
                  type="date"
                  value={formData.inspection_date || ""}
                  onChange={(e) => handleChange("inspection_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inspection_response_date">Inspection Response Date</Label>
                <Input
                  id="inspection_response_date"
                  type="date"
                  value={formData.inspection_response_date || ""}
                  onChange={(e) => handleChange("inspection_response_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="loan_contingency_date">Loan Contingency Date</Label>
                <Input
                  id="loan_contingency_date"
                  type="date"
                  value={formData.loan_contingency_date || ""}
                  onChange={(e) => handleChange("loan_contingency_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="appraisal_date">Appraisal Date</Label>
                <Input
                  id="appraisal_date"
                  type="date"
                  value={formData.appraisal_date || ""}
                  onChange={(e) => handleChange("appraisal_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="final_walkthrough_date">Final Walkthrough Date</Label>
                <Input
                  id="final_walkthrough_date"
                  type="date"
                  value={formData.final_walkthrough_date || ""}
                  onChange={(e) => handleChange("final_walkthrough_date", e.target.value)}
                />
              </div>
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
    </form>
  );
}