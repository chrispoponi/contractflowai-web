
import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import ContractForm from "../upload/ContractForm";
import { uploadContractFile } from "@/lib/storage";
import { invokeFunction } from "@/lib/supabaseFunctions";
import { supabaseEntities } from "@/lib/supabaseEntities";
import { getCurrentProfile } from "@/lib/supabaseAuth";

export default function UploadCounterOfferModal({ originalContractId, existingCounterOffers, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const nextCounterOfferNumber = existingCounterOffers.length + 1;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/"))) {
      processFile(droppedFile);
    } else {
      setError("Please upload a PDF or image file");
    }
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);

    try {
      const cachedUser = sessionStorage.getItem("user_data");
      let userId = cachedUser ? JSON.parse(cachedUser).id : null;
      if (!userId) {
        const profile = await getCurrentProfile();
        userId = profile?.id;
      }

      if (!userId) {
        throw new Error("You must be signed in to upload a counter offer.");
      }

      const uploadResult = await uploadContractFile({
        file: selectedFile,
        userId,
      });
      
      const file_url = uploadResult.signedUrl;

      // Define Contract schema inline
      const contractSchema = {
        type: "object",
        properties: {
          property_address: { type: "string" },
          representing_side: { type: "string", enum: ["buyer", "seller"] },
          buyer_name: { type: "string" },
          buyer_email: { type: "string" },
          buyer_phone: { type: "string" },
          seller_name: { type: "string" },
          seller_email: { type: "string" },
          seller_phone: { type: "string" },
          purchase_price: { type: "number" },
          earnest_money: { type: "number" },
          contract_date: { type: "string", format: "date" },
          closing_date: { type: "string", format: "date" },
          inspection_date: { type: "string", format: "date" },
          inspection_response_date: { type: "string", format: "date" },
          loan_contingency_date: { type: "string", format: "date" },
          appraisal_date: { type: "string", format: "date" },
          final_walkthrough_date: { type: "string", format: "date" },
          status: { type: "string" },
          plain_language_summary: { type: "string" },
          agent_notes: { type: "string" }
        }
      };

      const extractResult = await invokeFunction('extract-contract-data', {
        file_url,
        json_schema: contractSchema
      });

      if (extractResult.status === "success" && extractResult.output) {
        const summaryResponse = await invokeFunction('summarize-contract', {
          prompt: `You are reviewing a real estate counter offer. Summarize the key terms in 2-3 simple, clear sentences that a homebuyer would understand. Focus on: purchase price, important dates, and any special conditions.`,
          contract: extractResult.output
        });
        const summary =
          typeof summaryResponse === "string"
            ? summaryResponse
            : summaryResponse?.summary || "";

        setExtractedData({
          ...extractResult.output,
          contract_file_url: uploadResult.publicUrl || file_url,
          storage_path: uploadResult.path,
          plain_language_summary: summary,
          is_counter_offer: true,
          original_contract_id: originalContractId,
          counter_offer_number: nextCounterOfferNumber,
          status: "pending"
        });
      } else {
        throw new Error("Could not extract contract data");
      }
    } catch (err) {
      setError("Error processing counter offer. Please try again or enter details manually.");
      console.error(err);
    }

    setIsProcessing(false);
  };

  const handleSave = async (contractData) => {
    setIsProcessing(true);
    try {
      await supabaseEntities.Contract.create(contractData);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Error saving counter offer. Please try again.");
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload Counter Offer #{nextCounterOfferNumber}</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            This counter offer will be automatically linked to the original contract
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!extractedData && !isProcessing && (
            <Card className="border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors duration-300">
              <CardContent className="p-0">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`p-12 text-center transition-colors duration-200 ${
                    dragActive ? "bg-purple-50" : "bg-white"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center shadow-lg">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload Counter Offer Document
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Drag and drop the counter offer here, or click to browse. We'll automatically extract all the details.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Select Counter Offer
                  </Button>
                  <p className="text-sm text-gray-500 mt-6">
                    Supports PDF, PNG, and JPEG files
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Processing Counter Offer
                </h3>
                <p className="text-gray-600">
                  Reading and extracting contract details...
                </p>
              </CardContent>
            </Card>
          )}

          {extractedData && !isProcessing && (
            <div className="space-y-4">
              <Alert className="bg-purple-50 border-purple-200">
                <FileText className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Counter Offer #{nextCounterOfferNumber}</strong> - This will be automatically linked to the original contract
                </AlertDescription>
              </Alert>
              
              <ContractForm
                initialData={extractedData}
                onSave={handleSave}
                onCancel={() => {
                  setExtractedData(null);
                  setFile(null);
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
