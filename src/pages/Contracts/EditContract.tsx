import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import type { TablesInsert } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'

type ParsedContract = {
  title: string | null
  property_address: string | null
  client_name: string | null
  buyer_name: string | null
  buyer_email: string | null
  seller_name: string | null
  seller_email: string | null
  purchase_price: string | null
  closing_date: string | null
  inspection_date: string | null
  inspection_response_date: string | null
  loan_contingency_date: string | null
  appraisal_date: string | null
  final_walkthrough_date: string | null
  summary: string | null
}

type RiskItem = { severity?: string; description: string }

type ParserDiagnostics = {
  parser: 'primary' | 'vision-fallback'
  usedFallback: boolean
  primaryError?: string | null
} | null

interface ParserResponse {
  parsedContract: ParsedContract
  riskItems?: RiskItem[]
  diagnostics?: ParserDiagnostics
  summaryPath?: string | null
}

const CONTRACTS_BUCKET = import.meta.env.VITE_SUPABASE_CONTRACTS_BUCKET ?? 'contracts'
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'message/rfc822',
  'text/plain',
  'image/png',
  'image/jpeg'
]

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')

const toNumber = (value: string | null) => {
  if (!value) return null
  const normalized = value.replace(/[^0-9.]/g, '')
  return normalized ? Number(normalized) : null
}

export default function EditContract() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const [formData, setFormData] = useState<ParsedContract | null>(null)
  const [riskItems, setRiskItems] = useState<RiskItem[]>([])
  const [diagnostics, setDiagnostics] = useState<ParserDiagnostics>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const resetState = () => {
    setFile(null)
    setStoragePath(null)
    setFormData(null)
    setRiskItems([])
    setDiagnostics(null)
    setStatusMessage('')
  }

  const handleFieldChange = (field: keyof ParsedContract, value: string) => {
    setFormData((prev) => ({
      ...(prev ?? {}),
      [field]: value
    }))
  }

  const handleFileSelection = async (selectedFile: File | null) => {
    if (!user || !selectedFile) return

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Upload a file under 25 MB.',
        variant: 'destructive'
      })
      return
    }

    if (selectedFile.type && !ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
      toast({
        title: 'Unsupported file type',
        description: 'Upload a PDF, email export, image, or text document.',
        variant: 'destructive'
      })
      return
    }

    setIsParsing(true)
    setStatusMessage('Uploading contract…')
    setFormData(null)
    setRiskItems([])
    setDiagnostics(null)

    try {
      const safeName = sanitizeFileName(selectedFile.name || 'contract.pdf')
      const objectPath = `${user.id}/ingest/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from(CONTRACTS_BUCKET)
        .upload(objectPath, selectedFile, {
          upsert: true,
          cacheControl: '3600',
          contentType: selectedFile.type || 'application/pdf',
          metadata: { owner: user.id }
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      setFile(selectedFile)
      setStoragePath(objectPath)
      setStatusMessage('Parsing contract with AI…')

      const parserData = await invokeParser(objectPath, user.id)

      setFormData(parserData.parsedContract)
      setRiskItems(parserData.riskItems ?? [])
      setDiagnostics(parserData.diagnostics ?? null)
      setReviewOpen(true)
      setStatusMessage('Parsed successfully. Review & confirm.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse contract.'
      toast({ title: 'Parsing failed', description: message, variant: 'destructive' })
      resetState()
    } finally {
      setIsParsing(false)
    }
  }

  const invokeParser = async (objectPath: string, userId: string): Promise<ParserResponse> => {
    const tempContractId = crypto.randomUUID()
    const { data, error } = await supabase.functions.invoke<ParserResponse>('contractParsing', {
      body: {
        contractId: tempContractId,
        storagePath: objectPath,
        userId,
        persist: false
      }
    })

    if (error) {
      throw new Error(error.message ?? 'Edge function call failed')
    }

    if (!data?.parsedContract) {
      throw new Error('Parser did not return structured data')
    }

    return data
  }

  const handleConfirm = async () => {
    if (!user || !formData || !storagePath) return

    setIsSaving(true)
    setStatusMessage('Saving contract to workspace…')

    try {
      const payload: TablesInsert<'contracts'> = {
        user_id: user.id,
        title: formData.title ?? file?.name ?? 'New contract',
        property_address: formData.property_address,
        client_name: formData.client_name,
        buyer_name: formData.buyer_name,
        buyer_email: formData.buyer_email,
        seller_name: formData.seller_name,
        seller_email: formData.seller_email,
        purchase_price: toNumber(formData.purchase_price),
        closing_date: formData.closing_date,
        inspection_date: formData.inspection_date,
        inspection_response_date: formData.inspection_response_date,
        loan_contingency_date: formData.loan_contingency_date,
        appraisal_date: formData.appraisal_date,
        final_walkthrough_date: formData.final_walkthrough_date,
        agent_notes: formData.summary,
        status: 'pending',
        contract_file_url: storagePath
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert(payload)
        .select()
        .single()

      if (error) {
        throw error
      }

      toast({
        title: 'Contract saved',
        description: diagnostics?.usedFallback
          ? 'Stored with fallback parser—monitor logs for follow-up.'
          : 'AI parsed details stored successfully.'
      })

      resetState()
      setReviewOpen(false)
      navigate(`/contracts/${data.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save contract.'
      toast({ title: 'Save failed', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
      setStatusMessage('')
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="border border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle>Upload contracts after starting your free trial</CardTitle>
            <p className="text-sm text-slate-500">
              Create an account or sign in to unlock AI contract parsing, calendar sync, and automated reminders.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link to="/pricing">Start free trial</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>AI contract upload</CardTitle>
          <p className="text-sm text-slate-500">
            Drop a PDF or email export. We pull every deadline, party, and risk automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition ${
              isParsing ? 'opacity-60' : 'hover:border-slate-400 hover:bg-white'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
            />
            <p className="text-lg font-semibold text-slate-900">Drag & drop contract</p>
            <p className="text-sm text-slate-500">PDFs, forwarded emails, or .eml exports are supported.</p>
            <div className="mt-4">
              <Button variant="outline" disabled={isParsing}>
                Browse files
              </Button>
            </div>
            {statusMessage && <p className="mt-4 text-sm text-slate-500">{statusMessage}</p>}
          </div>

          {diagnostics?.usedFallback && (
            <Alert>
              <AlertDescription>
                Primary parser failed; vision fallback handled this upload. Check logs for <code>PRIMARY_PARSER_FAILED</code>.
              </AlertDescription>
            </Alert>
          )}

          {formData && !isParsing && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Parse ready</p>
              <p>We extracted key parties, dates, and risks. Review and confirm to save.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setReviewOpen(true)}>
                  Review parsed contract
                </Button>
                {file && (
                  <Button size="sm" variant="ghost" onClick={() => handleFileSelection(file)}>
                    Re-run parsing
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review & confirm</DialogTitle>
            <DialogDescription>Adjust any field before saving to your workspace.</DialogDescription>
          </DialogHeader>

          {formData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title ?? ''}
                    onChange={(event) => handleFieldChange('title', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="property_address">Property address</Label>
                  <Input
                    id="property_address"
                    value={formData.property_address ?? ''}
                    onChange={(event) => handleFieldChange('property_address', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="client_name">Client name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name ?? ''}
                    onChange={(event) => handleFieldChange('client_name', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_price">Purchase price</Label>
                  <Input
                    id="purchase_price"
                    value={formData.purchase_price ?? ''}
                    onChange={(event) => handleFieldChange('purchase_price', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="closing_date">Closing date</Label>
                  <Input
                    id="closing_date"
                    type="date"
                    value={formData.closing_date ?? ''}
                    onChange={(event) => handleFieldChange('closing_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="inspection_date">Inspection date</Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    value={formData.inspection_date ?? ''}
                    onChange={(event) => handleFieldChange('inspection_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="inspection_response_date">Inspection response</Label>
                  <Input
                    id="inspection_response_date"
                    type="date"
                    value={formData.inspection_response_date ?? ''}
                    onChange={(event) => handleFieldChange('inspection_response_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="loan_contingency_date">Loan contingency</Label>
                  <Input
                    id="loan_contingency_date"
                    type="date"
                    value={formData.loan_contingency_date ?? ''}
                    onChange={(event) => handleFieldChange('loan_contingency_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="appraisal_date">Appraisal date</Label>
                  <Input
                    id="appraisal_date"
                    type="date"
                    value={formData.appraisal_date ?? ''}
                    onChange={(event) => handleFieldChange('appraisal_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="final_walkthrough_date">Final walkthrough</Label>
                  <Input
                    id="final_walkthrough_date"
                    type="date"
                    value={formData.final_walkthrough_date ?? ''}
                    onChange={(event) => handleFieldChange('final_walkthrough_date', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="buyer_email">Buyer email</Label>
                  <Input
                    id="buyer_email"
                    value={formData.buyer_email ?? ''}
                    onChange={(event) => handleFieldChange('buyer_email', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="seller_email">Seller email</Label>
                  <Input
                    id="seller_email"
                    value={formData.seller_email ?? ''}
                    onChange={(event) => handleFieldChange('seller_email', event.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Executive summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary ?? ''}
                  onChange={(event) => handleFieldChange('summary', event.target.value)}
                  rows={4}
                />
              </div>

              {riskItems.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">AI risk highlights</p>
                  <div className="space-y-2">
                    {riskItems.map((risk, index) => (
                      <div key={`${risk.description}-${index}`} className="flex items-start gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            risk.severity === 'red'
                              ? 'border-rose-300 text-rose-600'
                              : risk.severity === 'yellow'
                              ? 'border-amber-300 text-amber-600'
                              : 'border-slate-200 text-slate-500'
                          }
                        >
                          {(risk.severity ?? 'info').toUpperCase()}
                        </Badge>
                        <span className="text-slate-600">{risk.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
