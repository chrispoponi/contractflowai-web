import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Shield, Search, Edit2, Save, X } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { UsersAPI } from '@/lib/supabase/queries/users'
import { AdminSubscriptionsAPI, type AdminSubscriptionPayload } from '@/lib/supabase/queries/adminSubscriptions'
import type { Database } from '@/lib/supabase/types'

type UserRow = Database['public']['Tables']['users']['Row']

const tierColors: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-800',
  beta: 'bg-purple-100 text-purple-800',
  team_beta: 'bg-pink-100 text-pink-800',
  budget: 'bg-blue-100 text-blue-800',
  professional: 'bg-indigo-100 text-indigo-800',
  team: 'bg-green-100 text-green-800'
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  trialing: 'bg-blue-100 text-blue-800'
}

export default function AdminSubscriptionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)

  const {
    data: currentUser,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => UsersAPI.getCurrent(user!.id)
  })

  const {
    data: adminUsers = [],
    isLoading,
    error: usersError
  } = useQuery({
    queryKey: ['admin-subscriptions'],
    enabled: currentUser?.role === 'admin',
    queryFn: () => AdminSubscriptionsAPI.list()
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; updates: AdminSubscriptionPayload }) =>
      AdminSubscriptionsAPI.updateUser(payload.id, payload.updates),
    onSuccess: () => {
      toast({ title: 'Subscription updated' })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }).catch(() => {})
    },
    onError: (error: Error) =>
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
  })

  const quickUpgradeMutation = useMutation({
    mutationFn: () => AdminSubscriptionsAPI.quickUpgrade(),
    onSuccess: () => {
      toast({ title: 'Upgraded to Professional' })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['current-user-profile', user?.id] }).catch(() => {})
    },
    onError: (error: Error) =>
      toast({ title: 'Upgrade failed', description: error.message, variant: 'destructive' })
  })

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return adminUsers.filter((person) => {
      return (
        person.email?.toLowerCase().includes(term) ||
        person.full_name?.toLowerCase().includes(term) ||
        person.subscription_tier?.toLowerCase().includes(term) ||
        person.stripe_customer_id?.toLowerCase().includes(term)
      )
    })
  }, [adminUsers, searchTerm])

  const getInputDate = (value: string | null) => (value ? value.slice(0, 10) : '')

  const handleEdit = (target: UserRow) => setEditingUser(target)
  const handleCancel = () => setEditingUser(null)

  const handleSave = () => {
    if (!editingUser) return
    const updates: AdminSubscriptionPayload = {
      subscription_tier: editingUser.subscription_tier,
      subscription_status: editingUser.subscription_status,
      trial_end_date: editingUser.trial_end_date,
      subscription_notes: editingUser.subscription_notes,
      stripe_customer_id: editingUser.stripe_customer_id
    }
    updateMutation.mutate({ id: editingUser.id, updates })
  }

  if (profileLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (profileError || currentUser?.role !== 'admin') {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>Access denied. You must be an admin to view this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">Subscription Management</h1>
            <p className="text-gray-600">Manage user subscriptions and payments</p>
          </div>
          {currentUser.subscription_tier === 'trial' && (
            <Button
              onClick={() => quickUpgradeMutation.mutate()}
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white hover:from-[#2d4a6f] hover:to-[#3b5998]"
              disabled={quickUpgradeMutation.isPending}
            >
              🎉 Activate My Professional Plan
            </Button>
          )}
        </header>

        {(usersError || updateMutation.error) && (
          <Alert variant="destructive">
            <AlertDescription>{usersError?.message ?? updateMutation.error?.message}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <CardTitle className="text-xl">All Users ({filteredUsers.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial End</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...new Array(4)].map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-12 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{person.full_name}</p>
                          <p className="text-sm text-gray-500">{person.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={tierColors[person.subscription_tier ?? 'trial'] ?? tierColors.trial}>
                            {(person.subscription_tier ?? 'trial').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[person.subscription_status ?? 'active'] ?? statusColors.active}>
                            {(person.subscription_status ?? 'active').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {person.trial_end_date ? format(new Date(person.trial_end_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(person)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {editingUser && (
          <Card className="border-2 border-[#1e3a5f] shadow-lg">
            <CardHeader className="border-b bg-blue-50">
              <CardTitle className="text-xl">Edit Subscription - {editingUser.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subscription Tier</Label>
                  <Select
                    value={editingUser.subscription_tier ?? 'trial'}
                    onValueChange={(value) => setEditingUser({ ...editingUser, subscription_tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="beta">Beta (Professional Access)</SelectItem>
                      <SelectItem value="team_beta">Team Beta (Team Access)</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    💡 Beta = unlimited professional features | Team Beta = unlimited + team management
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <Select
                    value={editingUser.subscription_status ?? 'active'}
                    onValueChange={(value) => setEditingUser({ ...editingUser, subscription_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trial End Date</Label>
                  <Input
                    type="date"
                    value={getInputDate(editingUser.trial_end_date)}
                    onChange={(event) =>
                      setEditingUser({
                        ...editingUser,
                        trial_end_date: event.target.value ? new Date(event.target.value).toISOString() : null
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stripe Customer ID</Label>
                  <Input
                    value={editingUser.stripe_customer_id ?? ''}
                    onChange={(event) => setEditingUser({ ...editingUser, stripe_customer_id: event.target.value })}
                    placeholder="cus_..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Add any notes about this subscription..."
                  value={editingUser.subscription_notes ?? ''}
                  onChange={(event) => setEditingUser({ ...editingUser, subscription_notes: event.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
