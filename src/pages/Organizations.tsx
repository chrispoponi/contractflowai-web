import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export default function Organizations() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [tier, setTier] = useState('starter')

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user!.id)
      if (error) throw error
      return data as Tables<'organizations'>[]
    }
  })

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('organizations')
        .insert({ name, subscription_tier: tier, owner_id: user!.id })
    },
    onSuccess: () => {
      setName('')
      toast({ title: 'Organization saved' })
      queryClient.invalidateQueries({ queryKey: ['organizations', user?.id] }).catch(() => {})
    },
    onError: (error) => toast({ title: 'Unable to save', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="space-y-6 px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>New organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Organization name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Subscription tier" value={tier} onChange={(event) => setTier(event.target.value)} />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Create organization
          </Button>
        </CardContent>
      </Card>
      {organizations.map((organization) => (
        <Card key={organization.id}>
          <CardHeader>
            <CardTitle>{organization.name}</CardTitle>
            <p className="text-sm text-slate-500">Tier: {organization.subscription_tier}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Created {new Date(organization.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
