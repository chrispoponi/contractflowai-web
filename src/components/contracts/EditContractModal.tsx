import { useState } from 'react'
import type { Tables } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface EditContractModalProps {
  contract: Tables<'contracts'>
  open: boolean
  onClose: () => void
  onSave: (updates: Partial<Tables<'contracts'>>) => Promise<void>
}

const statuses: Tables<'contracts'>['status'][] = [
  'pending',
  'under_contract',
  'inspection',
  'financing',
  'closing',
  'closed',
  'cancelled'
]

export default function EditContractModal({ contract, open, onClose, onSave }: EditContractModalProps) {
  const [form, setForm] = useState<Partial<Tables<'contracts'>>>(contract)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (field: keyof Tables<'contracts'>, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    await onSave(form)
    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit contract</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title ?? ''} onChange={(event) => handleChange('title', event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="client_name">Client</Label>
              <Input id="client_name" value={form.client_name ?? ''} onChange={(event) => handleChange('client_name', event.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="property_address">Property address</Label>
            <Input
              id="property_address"
              value={form.property_address ?? ''}
              onChange={(event) => handleChange('property_address', event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status ?? 'pending'} onValueChange={(value) => handleChange('status', value as Tables<'contracts'>['status'])}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purchase_price">Purchase price</Label>
              <Input
                id="purchase_price"
                type="number"
                value={form.purchase_price ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  handleChange('purchase_price', value ? Number(value) : null)
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="contract_date">Contract Date</Label>
              <Input
                id="contract_date"
                type="date"
                value={form.contract_date ?? ''}
                onChange={(event) => handleChange('contract_date', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="closing_date">Closing date</Label>
              <Input
                id="closing_date"
                type="date"
                value={form.closing_date ?? ''}
                onChange={(event) => handleChange('closing_date', event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="inspection_date">Inspection date</Label>
              <Input
                id="inspection_date"
                type="date"
                value={form.inspection_date ?? ''}
                onChange={(event) => handleChange('inspection_date', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inspection_response_date">Inspection Response</Label>
              <Input
                id="inspection_response_date"
                type="date"
                value={form.inspection_response_date ?? ''}
                onChange={(event) => handleChange('inspection_response_date', event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="loan_contingency_date">Loan Contingency</Label>
              <Input
                id="loan_contingency_date"
                type="date"
                value={form.loan_contingency_date ?? ''}
                onChange={(event) => handleChange('loan_contingency_date', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="appraisal_date">Appraisal date</Label>
              <Input
                id="appraisal_date"
                type="date"
                value={form.appraisal_date ?? ''}
                onChange={(event) => handleChange('appraisal_date', event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="final_walkthrough_date">Final Walkthrough</Label>
              <Input
                id="final_walkthrough_date"
                type="date"
                value={form.final_walkthrough_date ?? ''}
                onChange={(event) => handleChange('final_walkthrough_date', event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ai_summary">AI summary</Label>
            <Textarea id="ai_summary" rows={3} value={form.ai_summary ?? ''} onChange={(event) => handleChange('ai_summary', event.target.value)} />
          </div>
          <div>
            <Label htmlFor="timeline">Timeline JSON</Label>
            <Textarea
              id="timeline"
              rows={3}
              readOnly
              className="font-mono text-xs"
              value={JSON.stringify(form.timeline ?? {}, null, 2)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
