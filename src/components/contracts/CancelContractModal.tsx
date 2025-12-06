import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CancelContractModalProps {
  open: boolean
  onClose: () => void
  onCancel: (reason: string, notes: string) => Promise<void> | void
}

export default function CancelContractModal({ open, onClose, onCancel }: CancelContractModalProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason) return
    void onCancel(reason, notes)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-rose-900">
            <AlertTriangle className="h-5 w-5" /> Cancel contract
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            Cancelling moves the contract to archives and enforces RLS to hide it from shared dashboards.
          </div>
          <div>
            <Label htmlFor="reason">Cancellation reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer_backed_out">Buyer backed out</SelectItem>
                <SelectItem value="seller_backed_out">Seller backed out</SelectItem>
                <SelectItem value="inspection_failed">Inspection failed</SelectItem>
                <SelectItem value="financing_fell_through">Financing issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Keep active
            </Button>
            <Button type="submit" className="bg-rose-600 text-white hover:bg-rose-700" disabled={!reason}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Cancel contract
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
