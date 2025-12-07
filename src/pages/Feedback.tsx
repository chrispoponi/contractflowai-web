import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

type FeedbackRow = {
  id: string
  topic: string | null
  message: string
  created_at: string
  sentiment: string | null
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    email: user?.email ?? '',
    topic: '',
    sentiment: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackEnabled, setFeedbackEnabled] = useState(true)

  const { data: previousFeedback = [], isLoading } = useQuery({
    queryKey: ['feedback', user?.id, feedbackEnabled],
    enabled: Boolean(user?.id) && feedbackEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, topic, message, sentiment, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) {
        if (error.message?.toLowerCase().includes('feedback') && error.message?.toLowerCase().includes('does not exist')) {
          setFeedbackEnabled(false)
          return []
        }
        throw error
      }
      return (data as FeedbackRow[]) ?? []
    }
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Share feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Please sign in to leave feedback and help improve ContractFlowAI.
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.message.trim()) {
      toast({ title: 'Message required', description: 'Please share a bit more detail.', variant: 'destructive' })
      return
    }
    if (!feedbackEnabled) {
      toast({
        title: 'Feedback not configured',
        description: 'Ask an admin to create the feedback table in Supabase before submitting.',
        variant: 'destructive'
      })
      return
    }
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        email: form.email,
        topic: form.topic || 'General',
        sentiment: form.sentiment || null,
        message: form.message
      })
      if (error) throw error
      toast({ title: 'Thanks for the feedback!' })
      setForm((prev) => ({ ...prev, topic: '', sentiment: '', message: '' }))
    } catch (err) {
      toast({ title: 'Unable to send feedback', description: err instanceof Error ? err.message : String(err), variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>We’d love your feedback</CardTitle>
          <p className="text-sm text-slate-500">Tell us what’s working, what’s missing, or what would save you more time.</p>
        </CardHeader>
        <CardContent>
          {feedbackEnabled ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
              />
              <Input placeholder="Topic (optional)" value={form.topic} onChange={(event) => handleChange('topic', event.target.value)} />
              <Input
                placeholder="Mood / sentiment (optional)"
                value={form.sentiment}
                onChange={(event) => handleChange('sentiment', event.target.value)}
              />
              <Textarea
                rows={5}
                placeholder="Share your idea, bug report, or request…"
                value={form.message}
                onChange={(event) => handleChange('message', event.target.value)}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              Feedback storage is not configured yet. Ask your Supabase admin to create a `feedback` table with columns (
              user_id uuid, email text, topic text, sentiment text, message text, created_at timestamptz) and re-open this page.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your previous submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackEnabled && isLoading && <p className="text-sm text-slate-500">Loading feedback…</p>}
          {feedbackEnabled && !isLoading && previousFeedback.length === 0 && (
            <p className="text-sm text-slate-500">No feedback shared yet. Your first note will appear here.</p>
          )}
          {feedbackEnabled &&
            previousFeedback.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{entry.topic ?? 'General feedback'}</p>
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{entry.message}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {entry.sentiment && <span className="mr-2 uppercase tracking-wide">{entry.sentiment}</span>}
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          {!feedbackEnabled && (
            <p className="text-sm text-slate-500">
              Feedback history will appear once the Supabase table is created. No network requests are made while disabled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
