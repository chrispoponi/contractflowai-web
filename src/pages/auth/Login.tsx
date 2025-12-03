import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function AuthLogin() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleMagicLink = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
      if (error) throw error
      toast({ title: 'Magic link sent', description: 'Check your inbox to finish signing in.' })
    } catch (error) {
      toast({ title: 'Unable to send link', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-slate-500">Protected by Supabase Auth & Cloudflare Pages.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button className="w-full" onClick={handleMagicLink} disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send magic link'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleOAuth('google')}>
            Continue with Google
          </Button>
          <div className="text-center text-sm text-slate-500">
            <Link to="/auth/register" className="text-indigo-600">Create account</Link> ·{' '}
            <Link to="/auth/forgot-password" className="text-indigo-600">Forgot password?</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
