import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Profile() {
  const { user, session } = useAuth()

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <p className="text-sm text-slate-500">Session refreshed from Supabase on mount.</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">Email:</span> {user?.email}
          </p>
          <p>
            <span className="font-semibold">User ID:</span> {user?.id}
          </p>
          <p>
            <span className="font-semibold">Session expires:</span> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
