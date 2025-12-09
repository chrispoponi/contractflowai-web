import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface EmailSummaryModalProps {
  open: boolean
  onClose: () => void
  summary: string
  contractId: string
}

export function EmailSummaryModal({ open, onClose, summary, contractId }: EmailSummaryModalProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(summary)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (open) {
      setMessage(summary)
      setEmail('')
    }
  }, [open, summary])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email) {
      toast({ title: 'Email required', description: 'Please enter a recipient email.', variant: 'destructive' })
      return
    }
    setIsSending(true)
    try {
      const { error } = await supabase.functions.invoke('sendContractEmail', {
        body: {
          contractId,
          summary: message,
          recipient: email
        }
      })
      if (error) {
        throw error
      }
      toast({ title: 'Summary sent', description: `Email sent to ${email}.` })
      onClose()
    } catch (error) {
      console.error('[EmailSummaryModal] sendContractEmail failed', error)
      toast({
        title: 'Unable to send email',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email contract summary</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="summary-email">Recipient email</Label>
            <Input
              id="summary-email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="summary-text">Summary</Label>
            <Textarea
              id="summary-text"
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="font-medium text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? 'Sending…' : 'Send email summary'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EmailSummaryModal
