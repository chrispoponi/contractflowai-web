import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface TeamWithMembers extends Tables<'teams'> {
  team_members?: Tables<'team_members'>[]
}

export default function TeamManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [teamName, setTeamName] = useState('')

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(*)')
        .eq('owner_id', user!.id)
      if (error) throw error
      return data as TeamWithMembers[]
    }
  })

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error('Team name required')
      await supabase
        .from('teams')
        .insert({ name: teamName, owner_id: user!.id })
    },
    onSuccess: () => {
      setTeamName('')
      toast({ title: 'Team created' })
      queryClient.invalidateQueries({ queryKey: ['teams', user?.id] }).catch(() => {})
    },
    onError: (error) => toast({ title: 'Could not create team', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="space-y-6 px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Create team</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input placeholder="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          <Button onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>
            Add team
          </Button>
        </CardContent>
      </Card>
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            <p className="text-sm text-slate-500">{team.team_members?.length ?? 0} members</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(team.team_members ?? []).map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{member.user_id}</p>
                <p className="text-slate-500">Role: {member.role}</p>
              </div>
            ))}
            {team.team_members?.length === 0 && <p className="text-sm text-slate-500">No members yet.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
