import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import ContractDeadlines from '@/components/ContractDeadlines'
import EmailSummaryModal from '@/components/EmailSummaryModal'
import { CalendarContract, handleCalendarDownload } from '@/utils/calendar'

type ParsedDeadline = {
  label: string;
  key: keyof ExtractedContract;
  completed: boolean;
};

type ExtractedContract = {
  property_address?: string | null;
  buyer_name?: string | null;
  buyer_email?: string | null;
  seller_name?: string | null;
  seller_email?: string | null;
  purchase_price?: string | null;
  earnest_money?: string | null;
  contract_date?: string | null;
  inspection_date?: string | null;
  inspection_response_date?: string | null;
  loan_contingency_date?: string | null;
  appraisal_date?: string | null;
  final_walkthrough_date?: string | null;
  closing_date?: string | null;
  is_counter_offer?: boolean;
  counter_offer_number?: string | number | null;
  plain_language_summary?: string | null;
};

type ParsingPreview = {
  summary: string
  deadlines: { label: string; date: string | null; completed: boolean }[]
  contractId: string
  propertyAddress?: string | null
  title?: string | null
}

const DEADLINE_FIELDS: ParsedDeadline[] = [
  { key: "contract_date", label: "Contract Date", completed: false },
  { key: "inspection_date", label: "Inspection", completed: false },
  { key: "inspection_response_date", label: "Inspection Response", completed: false },
  { key: "loan_contingency_date", label: "Loan Contingency", completed: false },
  { key: "appraisal_date", label: "Appraisal", completed: false },
  { key: "final_walkthrough_date", label: "Final Walkthrough", completed: false },
  { key: "closing_date", label: "Closing", completed: false },
];

const buildDeadlines = (extracted?: ExtractedContract | null) => {
  return DEADLINE_FIELDS.map(({ key, label, completed }) => ({
    label,
    date: (extracted?.[key] as string | null) || null,
    completed,
  }));
};

export default function UploadContract() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [parsingResult, setParsingResult] = useState<ParsingPreview | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("Contract Timeline");

  const calendarContract = useMemo<CalendarContract | null>(() => {
    if (!parsingResult) return null;
    return {
      id: parsingResult.contractId,
      title: parsingResult.title || uploadTitle,
      propertyAddress: parsingResult.propertyAddress || undefined,
      summary: parsingResult.summary,
      deadlines: parsingResult.deadlines.map(({ label, date }) => ({ label, date })),
    };
  }, [parsingResult, uploadTitle]);

  const canDownloadCalendar =
    !!calendarContract?.deadlines?.some((deadline) => !!deadline.date);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().finally(() => {
      if (mounted) {
        setAuthReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!authReady) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-gray-500">Loading account…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
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

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || "application/pdf",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("contracts")
        .insert({
          user_id: user.id,
          contract_file_url: filePath,
          status: "uploaded",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        throw new Error(insertError?.message ?? "Failed to create contract record.");
      }

      contractId = inserted.id;
      toast({ title: "Uploaded", description: "Parsing contract…" });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contractParsing`;

      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contractId,
          storagePath: filePath,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? "Parser returned an error");
      }

      const payload = await response.json();
      const extracted = (payload?.extracted ?? {}) as ExtractedContract;
      const deadlines = buildDeadlines(extracted);

      setParsingResult({
        summary: extracted.plain_language_summary || 'No summary provided.',
        deadlines,
        contractId: payload?.contractId ?? contractId,
        propertyAddress: extracted.property_address ?? null,
        title: extracted.property_address ?? uploadTitle
      });

      toast({
        title: "Contract parsed",
        description: "Review the extracted details below.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
                {parsingResult.summary}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setEmailModalOpen(true)}>
                  Send summary via email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (calendarContract) {
                      handleCalendarDownload(calendarContract);
                    }
                  }}
                  disabled={!canDownloadCalendar}
                >
                  Download .ics
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/contracts/${parsingResult.contractId}`)}
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
              <ContractDeadlines deadlines={parsingResult.deadlines} />
            </CardContent>
          </Card>

          <EmailSummaryModal
            open={emailModalOpen}
            onClose={() => setEmailModalOpen(false)}
            summary={parsingResult.summary}
            contractId={parsingResult.contractId}
          />
        </>
      )}
    </div>
  );
}
