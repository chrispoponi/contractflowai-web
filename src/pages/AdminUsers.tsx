import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, UserPlus, Ban, RefreshCcw, TestTube } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

type AdminUser = {
  id: string
  email?: string
  created_at?: string
  last_sign_in_at?: string
  banned_until?: string | null
  user_metadata?: {
    full_name?: string
  }
}

interface AdminFunctionResponse {
  users?: AdminUser[]
  user?: AdminUser
  link?: string | null
}

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? 'chrispoponi@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export default function AdminUsers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = useMemo(() => {
    if (!user?.email) return user?.app_metadata?.role === 'admin'
    return user.app_metadata?.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase())
  }, [user])

  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '' })
  const [testMode, setTestMode] = useState(true) // Default to test mode for safety

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AdminFunctionResponse>('adminUsers', {
        body: { action: 'listUsers' }
      })
      if (error) throw new Error(error.message)
      return data?.users ?? []
    }
  })

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<AdminFunctionResponse>('adminUsers', {
        body: {
          action: 'createUser',
          payload: { ...newUser }
        }
      })
      if (error) throw new Error(error.message)
      return data?.user
    },
    onSuccess: () => {
      toast({ title: 'User created' })
      setNewUser({ email: '', password: '', fullName: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }).catch(() => {})
    },
    onError: (mutationError) => {
      toast({ title: 'Create failed', description: mutationError.message, variant: 'destructive' })
    }
  })

  const resetPassword = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<AdminFunctionResponse>('adminUsers', {
        body: {
          action: 'resetPassword',
          payload: { userId, testMode }
        }
      })
      if (error) throw new Error(error.message)
      
      if (testMode) {
        toast({
          title: '🧪 TEST MODE - No Action Taken',
          description: `Would send password reset link to ${email}`,
        })
      } else {
        toast({
          title: 'Reset link generated',
          description: data?.link ? `Link sent to ${email}` : 'Supabase handled password reset email.'
        })
      }
    } catch (err) {
      toast({ title: 'Reset failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' })
    }
  }

  const toggleBlockUser = async (adminUser: AdminUser) => {
    const isBanned = Boolean(adminUser.banned_until)
    try {
      const { error } = await supabase.functions.invoke('adminUsers', {
        body: {
          action: 'blockUser',
          payload: { userId: adminUser.id, banned: !isBanned, testMode }
        }
      })
      if (error) throw new Error(error.message)
      
      if (testMode) {
        toast({ 
          title: '🧪 TEST MODE - No Action Taken',
          description: `Would ${!isBanned ? 'block' : 'unblock'} user: ${adminUser.email}` 
        })
      } else {
        toast({ title: !isBanned ? 'User blocked' : 'User unblocked' })
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }).catch(() => {})
      }
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' })
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Only workspace administrators can view or manage users. Contact support if you need access.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-indigo-100 p-3 text-indigo-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
            <p className="text-sm text-slate-500">Create users, reset credentials, and manage account access.</p>
          </div>
        </div>
        
        {/* Test Mode Toggle */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2">
          <TestTube className={`h-4 w-4 ${testMode ? 'text-orange-500' : 'text-slate-400'}`} />
          <span className="text-sm font-medium text-slate-700">Test Mode</span>
          <button
            onClick={() => setTestMode(!testMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              testMode ? 'bg-orange-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                testMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          {testMode && <Badge variant="secondary" className="bg-orange-100 text-orange-700">Safe Mode</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create new user</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Full name"
            value={newUser.fullName}
            onChange={(event) => setNewUser((prev) => ({ ...prev, fullName: event.target.value }))}
          />
          <Input
            placeholder="Email"
            type="email"
            value={newUser.email}
            onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            placeholder="Temporary password"
            type="password"
            value={newUser.password}
            onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
          />
          <div className="md:col-span-3">
            <Button onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending} className="w-full md:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              {createUserMutation.isPending ? 'Creating…' : 'Add user'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workspace users</CardTitle>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-red-600">{error.message}</p>}
          {isLoading && <p className="text-sm text-slate-500">Loading users…</p>}
          {!isLoading && (users?.length ?? 0) === 0 && <p className="text-sm text-slate-500">No users found.</p>}
          {users?.map((adminUser) => {
            const isBanned = Boolean(adminUser.banned_until)
            return (
              <div
                key={adminUser.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {adminUser.user_metadata?.full_name ?? 'No name'}{' '}
                    {isBanned && <Badge variant="destructive">Blocked</Badge>}
                  </p>
                  <p className="text-sm text-slate-500">{adminUser.email}</p>
                  <p className="text-xs text-slate-400">
                    Last sign-in: {adminUser.last_sign_in_at ? new Date(adminUser.last_sign_in_at).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetPassword(adminUser.id, adminUser.email)}>
                    Reset password
                  </Button>
                  <Button
                    variant={isBanned ? 'secondary' : 'destructive'}
                    size="sm"
                    onClick={() => toggleBlockUser(adminUser)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {isBanned ? 'Unblock' : 'Block'}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
