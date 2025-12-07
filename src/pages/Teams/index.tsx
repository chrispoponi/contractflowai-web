import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { listTeams, createTeam as createTeamRecord } from '@/lib/supabase/queries/teams'

interface TeamWithMembers extends Tables<'teams'> {
  team_members?: Tables<'team_members'>[]
}

export default function TeamManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [teamName, setTeamName] = useState('')

  const {
    data: teamsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['teams', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTeams(user!.id)
  })

  const teams = Array.isArray(teamsData) ? teamsData : []

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error('Team name required')
      await createTeamRecord({ name: teamName, owner_id: user!.id })
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
      {error && (
        <Card>
          <CardContent className="text-sm text-red-600">Unable to load teams: {error.message}</CardContent>
        </Card>
      )}
      {isLoading && <p className="text-sm text-slate-500">Loading teams…</p>}
      {!isLoading &&
        teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <p className="text-sm text-slate-500">Team ID: {team.id}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-500">Members are managed in Supabase until relations are configured.</p>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
