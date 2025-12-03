
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EditContractModal({ contract, onSave, onClose }) {
  const [formData, setFormData] = useState({...contract});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Contract</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_address">Property Address *</Label>
                  <Input
                    id="property_address"
                    value={formData.property_address || ""}
                    onChange={(e) => handleChange("property_address", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
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
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="superseded">Superseded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Buyer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Buyer Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer_name">Buyer Name</Label>
                  <Input
                    id="buyer_name"
                    value={formData.buyer_name || ""}
                    onChange={(e) => handleChange("buyer_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer_email">Buyer Email</Label>
                  <Input
                    id="buyer_email"
                    type="email"
                    value={formData.buyer_email || ""}
                    onChange={(e) => handleChange("buyer_email", e.target.value)}
                    placeholder="buyer@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer_phone">Buyer Phone</Label>
                  <Input
                    id="buyer_phone"
                    type="tel"
                    value={formData.buyer_phone || ""}
                    onChange={(e) => handleChange("buyer_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Seller Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Seller Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller_name">Seller Name</Label>
                  <Input
                    id="seller_name"
                    value={formData.seller_name || ""}
                    onChange={(e) => handleChange("seller_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller_email">Seller Email</Label>
                  <Input
                    id="seller_email"
                    type="email"
                    value={formData.seller_email || ""}
                    onChange={(e) => handleChange("seller_email", e.target.value)}
                    placeholder="seller@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller_phone">Seller Phone</Label>
                  <Input
                    id="seller_phone"
                    type="tel"
                    value={formData.seller_phone || ""}
                    onChange={(e) => handleChange("seller_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Signature Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Signature Status</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="all_parties_signed" className="flex items-center gap-2">
                    All Parties Signed
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="all_parties_signed"
                      checked={formData.all_parties_signed || false}
                      onCheckedChange={(checked) => handleChange("all_parties_signed", checked)}
                    />
                    <span className="text-sm text-gray-600">
                      {formData.all_parties_signed ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                {formData.all_parties_signed && (
                  <div className="space-y-2">
                    <Label htmlFor="signature_date">Signature Date</Label>
                    <Input
                      id="signature_date"
                      type="date"
                      value={formData.signature_date || ""}
                      onChange={(e) => handleChange("signature_date", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Counter Offer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Counter Offer Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="is_counter_offer" className="flex items-center gap-2">
                    Is Counter Offer
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_counter_offer"
                      checked={formData.is_counter_offer || false}
                      onCheckedChange={(checked) => handleChange("is_counter_offer", checked)}
                    />
                    <span className="text-sm text-gray-600">
                      {formData.is_counter_offer ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                {formData.is_counter_offer && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="counter_offer_number">Counter Offer Number</Label>
                      <Input
                        id="counter_offer_number"
                        type="number"
                        value={formData.counter_offer_number || ""}
                        onChange={(e) => handleChange("counter_offer_number", parseInt(e.target.value))}
                        placeholder="1, 2, 3..."
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="original_contract_id">Original Contract ID</Label>
                      <Input
                        id="original_contract_id"
                        value={formData.original_contract_id || ""}
                        onChange={(e) => handleChange("original_contract_id", e.target.value)}
                        placeholder="ID of the original contract"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Financial Details</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    value={formData.purchase_price || ""}
                    onChange={(e) => handleChange("purchase_price", parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="earnest_money">Earnest Money</Label>
                  <Input
                    id="earnest_money"
                    type="number"
                    value={formData.earnest_money || ""}
                    onChange={(e) => handleChange("earnest_money", parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Important Dates */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Important Dates</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_date">Contract Date</Label>
                  <Input
                    id="contract_date"
                    type="date"
                    value={formData.contract_date || ""}
                    onChange={(e) => handleChange("contract_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closing_date">Closing Date</Label>
                  <Input
                    id="closing_date"
                    type="date"
                    value={formData.closing_date || ""}
                    onChange={(e) => handleChange("closing_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspection_date">Inspection Date</Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    value={formData.inspection_date || ""}
                    onChange={(e) => handleChange("inspection_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspection_response_date">Inspection Response Date</Label>
                  <Input
                    id="inspection_response_date"
                    type="date"
                    value={formData.inspection_response_date || ""}
                    onChange={(e) => handleChange("inspection_response_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan_contingency_date">Loan Contingency Date</Label>
                  <Input
                    id="loan_contingency_date"
                    type="date"
                    value={formData.loan_contingency_date || ""}
                    onChange={(e) => handleChange("loan_contingency_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appraisal_date">Appraisal Date</Label>
                  <Input
                    id="appraisal_date"
                    type="date"
                    value={formData.appraisal_date || ""}
                    onChange={(e) => handleChange("appraisal_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="agent_notes">Agent Notes</Label>
              <Textarea
                id="agent_notes"
                value={formData.agent_notes || ""}
                onChange={(e) => handleChange("agent_notes", e.target.value)}
                rows={4}
                placeholder="Add any private notes about this contract..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
