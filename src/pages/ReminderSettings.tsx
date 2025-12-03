import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'

interface ReminderPreferences {
  email: boolean
  sms: boolean
  dailyTime: string
  weeklyDigest: boolean
}

const defaultPreferences: ReminderPreferences = {
  email: true,
  sms: false,
  dailyTime: '08:00',
  weeklyDigest: true
}

export default function ReminderSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<ReminderPreferences>(defaultPreferences)

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
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
    if (profile?.reminder_preferences) {
      setPreferences({ ...defaultPreferences, ...(profile.reminder_preferences as ReminderPreferences) })
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('users')
        .update({ reminder_preferences: preferences })
        .eq('id', user!.id)
    },
    onSuccess: () => toast({ title: 'Reminder preferences saved' }),
    onError: (error) => toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Reminder preferences</CardTitle>
          <p className="text-sm text-slate-500">Stored securely in Supabase with RLS enforced per user.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email reminders</p>
              <p className="text-sm text-slate-500">Send contract updates via email.</p>
            </div>
            <Switch checked={preferences.email} onCheckedChange={(value) => setPreferences((prev) => ({ ...prev, email: value }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS reminders</p>
              <p className="text-sm text-slate-500">Requires verified phone number.</p>
            </div>
            <Switch checked={preferences.sms} onCheckedChange={(value) => setPreferences((prev) => ({ ...prev, sms: value }))} />
          </div>
          <div>
            <Label htmlFor="daily-time">Daily digest time</Label>
            <Input
              id="daily-time"
              type="time"
              value={preferences.dailyTime}
              onChange={(event) => setPreferences((prev) => ({ ...prev, dailyTime: event.target.value }))}
              className="mt-2 w-40"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly summary</p>
              <p className="text-sm text-slate-500">Monday mornings at 8am local time.</p>
            </div>
            <Switch checked={preferences.weeklyDigest} onCheckedChange={(value) => setPreferences((prev) => ({ ...prev, weeklyDigest: value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
