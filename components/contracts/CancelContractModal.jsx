import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, X } from "lucide-react";

export default function CancelContractModal({ onCancel, onClose }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) {
      alert("Please select a cancellation reason");
      return;
    }
    onCancel(reason, notes);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-900">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Cancel Contract
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>This will mark the contract as cancelled</strong> and move it to your archives. 
              The contract will no longer appear in active contracts or upcoming dates.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation_reason">Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer_backed_out">Buyer Backed Out</SelectItem>
                <SelectItem value="seller_backed_out">Seller Backed Out</SelectItem>
                <SelectItem value="inspection_failed">Failed Inspection</SelectItem>
                <SelectItem value="financing_fell_through">Financing Fell Through</SelectItem>
                <SelectItem value="appraisal_low">Low Appraisal</SelectItem>
                <SelectItem value="title_issues">Title Issues</SelectItem>
                <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation_notes">Additional Notes (Optional)</Label>
            <Textarea
              id="cancellation_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any additional details about why this contract was cancelled..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              Keep Contract Active
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mark as Cancelled
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}