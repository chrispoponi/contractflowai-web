import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'

export default function ClientUpdates() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [contractId, setContractId] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const { data: contracts = [] } = useQuery({
    queryKey: ['client-update-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, title, client_name')
        .eq('owner_id', user!.id)
      if (error) throw error
      return data as Pick<Tables<'contracts'>, 'id' | 'title' | 'client_name'>[]
    }
  })

  const handleSend = async () => {
    if (!contractId || !message.trim()) {
      toast({ title: 'Message required', description: 'Select a contract and write a short update.' })
      return
    }

    setIsSending(true)
    try {
      await supabase.functions.invoke('remindersEngine', {
        body: {
          ownerId: user?.id,
          contractId,
          cadence: 'client_update',
          message
        }
      })
      toast({ title: 'Client update queued' })
      setMessage('')
    } catch (error) {
      toast({ title: 'Failed to send', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Client updates</CardTitle>
          <p className="text-sm text-slate-500">Trigger messaging via Supabase Edge Functions.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contract">Contract</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger id="contract" className="mt-2">
                <SelectValue placeholder="Select contract" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.title} – {contract.client_name ?? 'Client'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share timeline, reminders, or helpful notes."
              className="mt-2"
            />
          </div>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending…' : 'Send update'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
