import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'

export default function TimelineGenerator() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [contractId, setContractId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { data: contracts = [] } = useQuery({
    queryKey: ['timeline-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, property_address')
        .eq('user_id', user!.id)
      if (error) throw error
      return data as Pick<Tables<'contracts'>, 'id' | 'property_address'>[]
    }
  })

  const handleGenerate = async () => {
    if (!contractId) {
      toast({ title: 'Pick a contract', description: 'Select a contract to generate timeline.' })
      return
    }
    setIsLoading(true)
    try {
      await supabase.functions.invoke('generateClientTimeline', {
        body: {
          userId: user?.id,
          contractId
        }
      })
      toast({ title: 'Timeline requested' })
    } catch (error) {
      toast({ title: 'Unable to generate', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Timeline generator</CardTitle>
          <p className="text-sm text-slate-500">Runs the Supabase Edge Function `generateClientTimeline`.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={contractId} onValueChange={setContractId}>
            <SelectTrigger>
              <SelectValue placeholder="Select contract" />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.property_address ?? 'Contract'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Requesting timeline…' : 'Generate timeline'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
