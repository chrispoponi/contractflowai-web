import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import type { TablesInsert } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type ParsedContract = {
  title?: string
  property_address?: string
  client_name?: string
  buyer_name?: string
  buyer_email?: string
  seller_name?: string
  seller_email?: string
  purchase_price?: string
  closing_date?: string
  inspection_date?: string
  inspection_response_date?: string
  loan_contingency_date?: string
  appraisal_date?: string
  final_walkthrough_date?: string
  summary?: string
}

type RiskItem = {
  severity?: string
  description: string
}

export default function EditContract() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [formData, setFormData] = useState<ParsedContract | null>(null)
  const [riskItems, setRiskItems] = useState<RiskItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [tempUploadPath, setTempUploadPath] = useState<string | null>(null)

  const handleFieldChange = (field: keyof ParsedContract, value: string) => {
    setFormData((prev) => ({ ...(prev ?? {}), [field]: value }))
  }

  const handleFileSelection = async (selectedFile: File | null) => {
    if (!user || !selectedFile) return
    setFile(selectedFile)
    setIsParsing(true)

    try {
      const tempPath = `${user.id}/uploads/${Date.now()}-${selectedFile.name}`
      const { error: uploadError } = await supabase.storage.from('uploads').upload(tempPath, selectedFile, { upsert: true })
      if (uploadError) throw uploadError
      setTempUploadPath(tempPath)

      const { data, error } = await supabase.functions.invoke('contractParsing', {
        body: {
          storagePath: tempPath,
          userId: user.id
        }
      })

      if (error) throw error

      const parsed = data?.parsedContract ?? data ?? {}
      setFormData({
        title: parsed.title ?? selectedFile.name,
        property_address: parsed.property_address ?? parsed.address ?? '',
        client_name: parsed.client_name ?? parsed.buyer_name ?? '',
        buyer_name: parsed.buyer_name ?? '',
        buyer_email: parsed.buyer_email ?? '',
        seller_name: parsed.seller_name ?? '',
        seller_email: parsed.seller_email ?? '',
        purchase_price: parsed.purchase_price ? String(parsed.purchase_price) : '',
        closing_date: parsed.closing_date ?? '',
        inspection_date: parsed.inspection_date ?? '',
        inspection_response_date: parsed.inspection_response_date ?? '',
        loan_contingency_date: parsed.loan_contingency_date ?? '',
        appraisal_date: parsed.appraisal_date ?? '',
        final_walkthrough_date: parsed.final_walkthrough_date ?? '',
        summary: parsed.executive_summary ?? parsed.summary ?? ''
      })
      setRiskItems(parsed.risk_items ?? parsed.risks ?? [])
      setReviewOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse contract'
      toast({ title: 'Parsing failed', description: message, variant: 'destructive' })
      setFile(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirm = async () => {
    if (!user || !file || !formData) return
    setIsSaving(true)
    try {
      const storagePath = `${user.id}/contracts/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('contracts').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      })
      if (uploadError) throw uploadError

      const payload: TablesInsert<'contracts'> = {
        user_id: user.id,
        title: formData.title || file.name,
        property_address: formData.property_address || null,
        client_name: formData.client_name || null,
        buyer_name: formData.buyer_name || null,
        buyer_email: formData.buyer_email || null,
        seller_name: formData.seller_name || null,
        seller_email: formData.seller_email || null,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        closing_date: formData.closing_date || null,
        inspection_date: formData.inspection_date || null,
        inspection_response_date: formData.inspection_response_date || null,
        loan_contingency_date: formData.loan_contingency_date || null,
        appraisal_date: formData.appraisal_date || null,
        final_walkthrough_date: formData.final_walkthrough_date || null,
        agent_notes: formData.summary || null,
        status: 'pending',
        contract_file_url: storagePath
      }

      const { data: newContract, error: insertError } = await supabase
        .from('contracts')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw insertError

      toast({ title: 'Contract saved', description: 'AI parsed details stored successfully.' })
      setReviewOpen(false)
      setFormData(null)
      setFile(null)
      setRiskItems([])
      if (tempUploadPath) {
        void supabase.storage.from('uploads').remove([tempUploadPath])
        setTempUploadPath(null)
      }
      navigate(`/contracts/${newContract.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save contract'
      toast({ title: 'Save failed', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {!user ? (
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
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>AI contract upload</CardTitle>
              <p className="text-sm text-slate-500">
                Drop a PDF or email export. Our Edge Function parses every party, date, and clause automatically.
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
                  accept="application/pdf,text/plain,message/rfc822,.eml,.txt"
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
                {isParsing && <p className="mt-4 text-sm text-slate-500">Analyzing with AI…</p>}
              </div>

              {formData && !isParsing && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Parse ready</p>
                  <p>We extracted key parties, dates, and risks. Review and confirm to save.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setReviewOpen(true)}>
                      Review parsed contract
                    </Button>
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
                              {risk.severity ? risk.severity.toUpperCase() : 'INFO'}
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
        </>
      )}
    </div>
  )
}
