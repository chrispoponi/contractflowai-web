import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function DebugReminders() {
  const { user } = useAuth()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: async (payload: { cadence: 'daily' | 'weekly' | 'sms' }) => {
      await supabase.functions.invoke('remindersEngine', {
        body: {
          ownerId: user?.id,
          cadence: payload.cadence
        }
      })
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Reminder run queued', description: `Cadence: ${variables.cadence}` })
    },
    onError: (error) => toast({ title: 'Reminder run failed', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Reminders engine</CardTitle>
          <p className="text-sm text-slate-500">Invoke Supabase Edge functions to test messaging workflows.</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => mutation.mutate({ cadence: 'daily' })} disabled={mutation.isPending}>
            Send daily reminders
          </Button>
          <Button variant="outline" onClick={() => mutation.mutate({ cadence: 'weekly' })} disabled={mutation.isPending}>
            Send weekly digest
          </Button>
          <Button variant="outline" onClick={() => mutation.mutate({ cadence: 'sms' })} disabled={mutation.isPending}>
            Send SMS alerts
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
