import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'

export default function BrokerageSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [organizationId, setOrganizationId] = useState('')

  const { data: organizations = [] } = useQuery({
    queryKey: ['org-options', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user!.id)
      if (error) throw error
      return data as Pick<Tables<'organizations'>, 'id' | 'name'>[]
    }
  })

  const { data: profile } = useQuery({
    queryKey: ['brokerage-profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as Tables<'users'>
    }
  })

  useEffect(() => {
    if (profile?.organization_id) setOrganizationId(profile.organization_id)
  }, [profile?.organization_id])

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', user!.id)
    },
    onSuccess: () => toast({ title: 'Brokerage saved' }),
    onError: (error) => toast({ title: 'Unable to save', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Brokerage settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="brokerage">Organization</Label>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger id="brokerage">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !organizationId}>
            Save organization
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
