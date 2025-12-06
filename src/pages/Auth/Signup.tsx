import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function AuthRegister() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleRegister = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin
        }
      })
      if (error) throw error
      toast({ title: 'Verify your inbox', description: 'Confirm the sign-up email to finish onboarding.' })
    } catch (error) {
      toast({ title: 'Unable to register', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <p className="text-sm text-slate-500">Supabase Auth stores credentials with email magic links.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button className="w-full" onClick={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </Button>
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link to="/auth/login" className="text-indigo-600">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
