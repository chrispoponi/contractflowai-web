import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['settings-profile', user?.id],
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
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('users')
        .update({ full_name: fullName, phone })
        .eq('id', user!.id)
    },
    onSuccess: () => toast({ title: 'Profile updated' }),
    onError: (error) => toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
