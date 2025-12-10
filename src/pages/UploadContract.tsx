import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import ContractDeadlines from "@/components/ContractDeadlines";
import EmailSummaryModal from "@/components/EmailSummaryModal";

// Debug indicator
console.log("🔥 UploadContract MOUNTED");

const DEADLINE_FIELDS = [
  { key: "inspection_date", label: "Inspection" },
  { key: "inspection_response_date", label: "Inspection Response" },
  { key: "appraisal_date", label: "Appraisal" },
  { key: "loan_contingency_date", label: "Loan Contingency" },
  { key: "final_walkthrough_date", label: "Final Walkthrough" },
  { key: "closing_date", label: "Closing" }
] as const;

export type ContractParsingResult = {
  summary?: string | null;
  deadlines?: Record<string, string | null> | null;
  contractId: string;
};

type ContractParsingEdgeResponse = ContractParsingResult & {
  attempts?: unknown;
};

export default function UploadContract() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [parsingResult, setParsingResult] = useState<ContractParsingResult | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("Contract Timeline");

  // Ensure we have an auth session before enabling UI
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(() => {
      if (mounted) setAuthReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Create simplified list for UI deadline display
  const deadlineList = useMemo(() => {
    const deadlines = parsingResult?.deadlines ?? {};
    return DEADLINE_FIELDS.map(({ key, label }) => {
      const date = deadlines?.[key] ?? null;
      const completed = Boolean(date && new Date(date) < new Date());
      return { label, date, completed };
    });
  }, [parsingResult]);

  if (!authReady) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-gray-500">Loading account…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // -----------------------------------------------------------------------
  // HANDLE FILE UPLOAD
  // -----------------------------------------------------------------------
  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setParsingResult(null);

    let contractId: string | null = null;

    try {
      const fileExt = file.name.split(".").pop() || "pdf";
      const uniqueId = crypto.randomUUID();
      const filePath = `${user.id}/${uniqueId}.${fileExt}`;

      setUploadTitle(file.name.replace(/\.[^/.]+$/, "") || "Contract Timeline");

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || "application/pdf"
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive"
        });
        return;
      }

      // Insert DB record
      const { data: inserted, error: insertError } = await supabase
        .from("contracts")
        .insert({
          user_id: user.id,
          contract_file_url: filePath,
          status: "uploaded"
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error("❌ Insert error:", insertError);
        toast({
          title: "Upload failed",
          description: "Could not create contract record.",
          variant: "destructive"
        });
        return;
      }

      contractId = inserted.id;

      toast({ title: "Uploaded", description: "Parsing contract…" });

      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.error("❌ No access token found.");
        toast({
          title: "Auth error",
          description: "Please log in again.",
          variant: "destructive"
        });
        return;
      }

      const payload = {
        storagePath: filePath,
        userId: user.id,
        contractId,
        persist: true
      };

      console.log("📤 Sending payload to edge:", JSON.stringify(payload, null, 2));

      // IMPORTANT: JSON.stringify REQUIRED
      const { data: parseData, error: parseError } =
        await supabase.functions.invoke<ContractParsingEdgeResponse>("contractParsing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

      console.log("📥 Edge response:", parseData, parseError);

      if (parseError) {
        console.error("❌ Parse error:", parseError);
        toast({
          title: "Parsing failed",
          description: "Our team has been notified.",
          variant: "destructive"
        });
        return;
      }

      if (!parseData) {
        throw new Error("Edge function returned empty payload.");
      }

      // Store UI result
      const resolvedContractId =
        parseData.contractId ??
        (parseData as Record<string, string | null>)?.id ??
        contractId;

      setParsingResult({
        summary: parseData.summary ?? null,
        deadlines: parseData.deadlines ?? {},
        contractId: resolvedContractId
      });

      toast({
        title: "Contract parsed",
        description: "Review your summary below."
      });
    } catch (err) {
      console.error("🔥 Unexpected error:", err);
      toast({
        title: "Upload failed",
        description: "Something went wrong.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }

  // -----------------------------------------------------------------------
  // CALENDAR EXPORT
  // -----------------------------------------------------------------------
  function formatICSDate(date: Date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  function handleCalendarDownload() {
    if (!parsingResult?.deadlines) return;

    const now = new Date();
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ContractFlowAI//EN"];

    DEADLINE_FIELDS.forEach(({ key, label }) => {
      const date = parsingResult.deadlines?.[key];
      if (!date) return;

      const normalized = date.replace(/-/g, "");
      ics.push("BEGIN:VEVENT");
      ics.push(`UID:${parsingResult.contractId}-${key}@contractflowai`);
      ics.push(`DTSTAMP:${formatICSDate(now)}`);
      ics.push(`SUMMARY:${label} - ${uploadTitle}`);
      ics.push(`DTSTART;VALUE=DATE:${normalized}`);
      ics.push("DURATION:P1D");
      ics.push("END:VEVENT");
    });

    ics.push("END:VCALENDAR");

    const blob = new Blob([ics.join("\r\n")], {
      type: "text/calendar;charset=utf-8"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${uploadTitle.replace(/\s+/g, "_")}_deadlines.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // -----------------------------------------------------------------------
  // UI RENDER
  // -----------------------------------------------------------------------
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4">
      <Card className="rounded-lg border bg-white p-6 shadow-md">
        <CardHeader>
          <CardTitle>AI Contract Upload</CardTitle>
        </CardHeader>

        <CardContent>
          <label className="block w-full cursor-pointer rounded-md border-2 border-dashed p-10 text-center text-gray-600 hover:bg-gray-50">
            {uploading ? "Uploading…" : "Click to choose a contract"}
            <input
              type="file"
              accept=".pdf,.eml,.msg"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </CardContent>
      </Card>

      {parsingResult && (
        <>
          <Card className="border bg-white shadow-lg">
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-base leading-relaxed text-slate-700">
                {parsingResult.summary?.trim() || "No summary generated yet."}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setEmailModalOpen(true)}>
                  Send summary via email
                </Button>

                <Button variant="outline" onClick={handleCalendarDownload}>
                  Add to calendar
                </Button>

                <Button
                  variant="ghost"
                  disabled={!parsingResult.contractId}
                  onClick={() => {
                    if (!parsingResult.contractId) return
                    navigate(`/contracts/${parsingResult.contractId}`)
                  }}
                >
                  View contract
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Deadlines</CardTitle>
            </CardHeader>

            <CardContent>
              <ContractDeadlines deadlines={deadlineList} />
            </CardContent>
          </Card>

          <EmailSummaryModal
            open={emailModalOpen}
            onClose={() => setEmailModalOpen(false)}
            summary={parsingResult.summary?.trim() || "No summary generated yet."}
            contractId={parsingResult.contractId ?? ''}
          />
        </>
      )}
    </div>
  );
}
