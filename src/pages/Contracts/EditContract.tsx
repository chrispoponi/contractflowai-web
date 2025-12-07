import { useEffect, useRef, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'

type ParsedContract = {
  title: string | null
  property_address: string | null
  client_name: string | null
  buyer_name: string | null
  buyer_email: string | null
  seller_name: string | null
  seller_email: string | null
  purchase_price: string | null
  earnest_money: string | null
  contract_date: string | null
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
  regexApplied?: boolean
  deadlineRulesApplied?: boolean
} | null

type FieldSource = 'ai' | 'regex' | 'rule' | 'manual'

type FieldMeta = {
  source: FieldSource
  confidence: number
  needsVerification: boolean
  reason?: string
}

interface ParserResponse {
  parsedContract: ParsedContract
  riskItems?: RiskItem[]
  diagnostics?: ParserDiagnostics
  fieldMeta?: Partial<Record<keyof ParsedContract, FieldMeta>>
  needsVerification?: (keyof ParsedContract)[]
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

const FIELD_LABELS: Record<keyof ParsedContract, string> = {
  title: 'Title',
  property_address: 'Property address',
  client_name: 'Client name',
  buyer_name: 'Buyer name',
  buyer_email: 'Buyer email',
  seller_name: 'Seller name',
  seller_email: 'Seller email',
  purchase_price: 'Purchase price',
  earnest_money: 'Earnest money',
  contract_date: 'Contract date',
  closing_date: 'Closing date',
  inspection_date: 'Inspection deadline',
  inspection_response_date: 'Inspection response',
  loan_contingency_date: 'Financing contingency',
  appraisal_date: 'Appraisal contingency',
  final_walkthrough_date: 'Final walkthrough',
  summary: 'Executive summary'
}

const SOURCE_DESCRIPTION: Record<FieldSource, string> = {
  ai: 'AI parsed',
  regex: 'Clause detected',
  rule: 'Timeline rule',
  manual: 'Manual edit'
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
  const [fieldMeta, setFieldMeta] = useState<Partial<Record<keyof ParsedContract, FieldMeta>> | null>(null)
  const [fieldsNeedingReview, setFieldsNeedingReview] = useState<(keyof ParsedContract)[]>([])
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [datesConfirmed, setDatesConfirmed] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  const resetState = () => {
    setFile(null)
    setStoragePath(null)
    setFormData(null)
    setRiskItems([])
    setDiagnostics(null)
    setFieldMeta(null)
    setFieldsNeedingReview([])
    setStatusMessage('')
    setDatesConfirmed(false)
    setIsGeneratingLink(false)
  }

  const requiresManualReview = fieldsNeedingReview.length > 0

  useEffect(() => {
    if (fieldsNeedingReview.length === 0) {
      setDatesConfirmed(true)
    }
  }, [fieldsNeedingReview])

  const renderSourceBadge = (field: keyof ParsedContract) => {
    const metaInfo = fieldMeta?.[field]
    if (!metaInfo) return null
    const badgeClass = metaInfo.needsVerification
      ? 'bg-amber-100 text-amber-800 border border-amber-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200'
    return (
      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {SOURCE_DESCRIPTION[metaInfo.source]}
      </span>
    )
  }

  const renderFieldHint = (field: keyof ParsedContract) => {
    const metaInfo = fieldMeta?.[field]
    if (!metaInfo?.reason) return null
    return (
      <p className={`mt-1 text-xs ${metaInfo.needsVerification ? 'text-amber-700' : 'text-slate-500'}`}>
        {metaInfo.reason}
        {metaInfo.needsVerification ? ' — please verify.' : ''}
      </p>
    )
  }

  const handleDownloadOriginal = async () => {
    if (!storagePath) return
    try {
      setIsGeneratingLink(true)
      const { data, error } = await supabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(storagePath, 300)
      if (error || !data?.signedUrl) {
        throw error ?? new Error('Missing signed URL')
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create download link.'
      toast({ title: 'Download failed', description: message, variant: 'destructive' })
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleFieldChange = (field: keyof ParsedContract, value: string) => {
    setFormData((prev) => ({
      ...(prev ?? {}),
      [field]: value
    }))

    setFieldMeta((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [field]: {
          source: 'manual',
          confidence: 1,
          needsVerification: false,
          reason: 'Manually confirmed'
        }
      }
    })

    setFieldsNeedingReview((prev) => prev.filter((key) => key !== field))
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
      const contractPayload = parserData.parsedContract

      setFormData(contractPayload)
      setRiskItems(parserData.riskItems ?? [])
      setDiagnostics(parserData.diagnostics ?? null)
      setFieldMeta(parserData.fieldMeta ?? null)
      const reviewTargets = (parserData.needsVerification ?? []) as (keyof ParsedContract)[]
      setFieldsNeedingReview(reviewTargets)
      setDatesConfirmed(reviewTargets.length === 0)
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
        earnest_money: toNumber(formData.earnest_money),
        contract_date: formData.contract_date,
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

      if (storagePath) {
        try {
          await supabase.functions.invoke('contractParsing', {
            body: {
              contractId: data.id,
              storagePath,
              userId: user.id,
              persist: true
            }
          })
        } catch (syncError) {
          console.error('[CONTRACT_FINALIZE_FAILED]', syncError)
        }
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setReviewOpen(true)}>
                  Review parsed contract
                </Button>
                {file && (
                  <Button size="sm" variant="ghost" onClick={() => handleFileSelection(file)}>
                    Re-run parsing
                  </Button>
                )}
                {storagePath && (
                  <Button size="sm" variant="ghost" onClick={handleDownloadOriginal} disabled={isGeneratingLink}>
                    {isGeneratingLink ? 'Preparing download…' : 'Download original'}
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
              {requiresManualReview && (
                <Alert variant="destructive">
                  <AlertDescription>
                    AI needs confirmation for:{' '}
                    {fieldsNeedingReview.map((field) => FIELD_LABELS[field]).join(', ')}. Please verify before saving.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title" className="flex items-center justify-between gap-2">
                    <span>Title</span>
                    {renderSourceBadge('title')}
                  </Label>
                  <Input
                    id="title"
                    value={formData.title ?? ''}
                    onChange={(event) => handleFieldChange('title', event.target.value)}
                  />
                  {renderFieldHint('title')}
                </div>
                <div>
                  <Label htmlFor="property_address" className="flex items-center justify-between gap-2">
                    <span>Property address</span>
                    {renderSourceBadge('property_address')}
                  </Label>
                  <Input
                    id="property_address"
                    value={formData.property_address ?? ''}
                    onChange={(event) => handleFieldChange('property_address', event.target.value)}
                  />
                  {renderFieldHint('property_address')}
                </div>
                <div>
                  <Label htmlFor="client_name" className="flex items-center justify-between gap-2">
                    <span>Client name</span>
                    {renderSourceBadge('client_name')}
                  </Label>
                  <Input
                    id="client_name"
                    value={formData.client_name ?? ''}
                    onChange={(event) => handleFieldChange('client_name', event.target.value)}
                  />
                  {renderFieldHint('client_name')}
                </div>
                <div>
                  <Label htmlFor="contract_date" className="flex items-center justify-between gap-2">
                    <span>Contract date</span>
                    {renderSourceBadge('contract_date')}
                  </Label>
                  <Input
                    id="contract_date"
                    type="date"
                    value={formData.contract_date ?? ''}
                    onChange={(event) => handleFieldChange('contract_date', event.target.value)}
                  />
                  {renderFieldHint('contract_date')}
                </div>
                <div>
                  <Label htmlFor="buyer_name" className="flex items-center justify-between gap-2">
                    <span>Buyer name</span>
                    {renderSourceBadge('buyer_name')}
                  </Label>
                  <Input
                    id="buyer_name"
                    value={formData.buyer_name ?? ''}
                    onChange={(event) => handleFieldChange('buyer_name', event.target.value)}
                  />
                  {renderFieldHint('buyer_name')}
                </div>
                <div>
                  <Label htmlFor="buyer_email" className="flex items-center justify-between gap-2">
                    <span>Buyer email</span>
                    {renderSourceBadge('buyer_email')}
                  </Label>
                  <Input
                    id="buyer_email"
                    value={formData.buyer_email ?? ''}
                    onChange={(event) => handleFieldChange('buyer_email', event.target.value)}
                  />
                  {renderFieldHint('buyer_email')}
                </div>
                <div>
                  <Label htmlFor="seller_name" className="flex items-center justify-between gap-2">
                    <span>Seller name</span>
                    {renderSourceBadge('seller_name')}
                  </Label>
                  <Input
                    id="seller_name"
                    value={formData.seller_name ?? ''}
                    onChange={(event) => handleFieldChange('seller_name', event.target.value)}
                  />
                  {renderFieldHint('seller_name')}
                </div>
                <div>
                  <Label htmlFor="seller_email" className="flex items-center justify-between gap-2">
                    <span>Seller email</span>
                    {renderSourceBadge('seller_email')}
                  </Label>
                  <Input
                    id="seller_email"
                    value={formData.seller_email ?? ''}
                    onChange={(event) => handleFieldChange('seller_email', event.target.value)}
                  />
                  {renderFieldHint('seller_email')}
                </div>
                <div>
                  <Label htmlFor="purchase_price" className="flex items-center justify-between gap-2">
                    <span>Purchase price</span>
                    {renderSourceBadge('purchase_price')}
                  </Label>
                  <Input
                    id="purchase_price"
                    value={formData.purchase_price ?? ''}
                    onChange={(event) => handleFieldChange('purchase_price', event.target.value)}
                  />
                  {renderFieldHint('purchase_price')}
                </div>
                <div>
                  <Label htmlFor="earnest_money" className="flex items-center justify-between gap-2">
                    <span>Earnest money</span>
                    {renderSourceBadge('earnest_money')}
                  </Label>
                  <Input
                    id="earnest_money"
                    value={formData.earnest_money ?? ''}
                    onChange={(event) => handleFieldChange('earnest_money', event.target.value)}
                  />
                  {renderFieldHint('earnest_money')}
                </div>
                <div>
                  <Label htmlFor="closing_date" className="flex items-center justify-between gap-2">
                    <span>Closing date</span>
                    {renderSourceBadge('closing_date')}
                  </Label>
                  <Input
                    id="closing_date"
                    type="date"
                    value={formData.closing_date ?? ''}
                    onChange={(event) => handleFieldChange('closing_date', event.target.value)}
                  />
                  {renderFieldHint('closing_date')}
                </div>
                <div>
                  <Label htmlFor="inspection_date" className="flex items-center justify-between gap-2">
                    <span>Inspection date</span>
                    {renderSourceBadge('inspection_date')}
                  </Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    value={formData.inspection_date ?? ''}
                    onChange={(event) => handleFieldChange('inspection_date', event.target.value)}
                  />
                  {renderFieldHint('inspection_date')}
                </div>
                <div>
                  <Label htmlFor="inspection_response_date" className="flex items-center justify-between gap-2">
                    <span>Inspection response</span>
                    {renderSourceBadge('inspection_response_date')}
                  </Label>
                  <Input
                    id="inspection_response_date"
                    type="date"
                    value={formData.inspection_response_date ?? ''}
                    onChange={(event) => handleFieldChange('inspection_response_date', event.target.value)}
                  />
                  {renderFieldHint('inspection_response_date')}
                </div>
                <div>
                  <Label htmlFor="loan_contingency_date" className="flex items-center justify-between gap-2">
                    <span>Loan contingency</span>
                    {renderSourceBadge('loan_contingency_date')}
                  </Label>
                  <Input
                    id="loan_contingency_date"
                    type="date"
                    value={formData.loan_contingency_date ?? ''}
                    onChange={(event) => handleFieldChange('loan_contingency_date', event.target.value)}
                  />
                  {renderFieldHint('loan_contingency_date')}
                </div>
                <div>
                  <Label htmlFor="appraisal_date" className="flex items-center justify-between gap-2">
                    <span>Appraisal date</span>
                    {renderSourceBadge('appraisal_date')}
                  </Label>
                  <Input
                    id="appraisal_date"
                    type="date"
                    value={formData.appraisal_date ?? ''}
                    onChange={(event) => handleFieldChange('appraisal_date', event.target.value)}
                  />
                  {renderFieldHint('appraisal_date')}
                </div>
                <div>
                  <Label htmlFor="final_walkthrough_date" className="flex items-center justify-between gap-2">
                    <span>Final walkthrough</span>
                    {renderSourceBadge('final_walkthrough_date')}
                  </Label>
                  <Input
                    id="final_walkthrough_date"
                    type="date"
                    value={formData.final_walkthrough_date ?? ''}
                    onChange={(event) => handleFieldChange('final_walkthrough_date', event.target.value)}
                  />
                  {renderFieldHint('final_walkthrough_date')}
                </div>
              </div>

              <div>
                <Label htmlFor="summary" className="flex items-center justify-between gap-2">
                  <span>Executive summary</span>
                  {renderSourceBadge('summary')}
                </Label>
                <Textarea
                  id="summary"
                  value={formData.summary ?? ''}
                  onChange={(event) => handleFieldChange('summary', event.target.value)}
                  rows={4}
                />
                {renderFieldHint('summary')}
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

              {requiresManualReview && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <Checkbox
                    id="confirm-dates"
                    checked={datesConfirmed}
                    onCheckedChange={(checked) => setDatesConfirmed(Boolean(checked))}
                    className="mt-1"
                  />
                  <label htmlFor="confirm-dates" className="cursor-pointer">
                    I reviewed {fieldsNeedingReview.map((field) => FIELD_LABELS[field]).join(', ')} and confirm they are accurate.
                  </label>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving || (requiresManualReview && !datesConfirmed)}>
              {isSaving ? 'Saving…' : 'Save contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
