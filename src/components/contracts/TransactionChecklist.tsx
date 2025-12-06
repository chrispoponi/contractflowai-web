import type { Tables } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle } from 'lucide-react'

interface TransactionChecklistProps {
  contract: Tables<'contracts'>
  onToggle: (taskId: string, nextValue: boolean) => Promise<void>
}

const defaultTasks = [
  { id: 'inspection', label: 'Inspection complete' },
  { id: 'appraisal', label: 'Appraisal delivered' },
  { id: 'loan_clear', label: 'Clear to close' },
  { id: 'final_walk', label: 'Final walkthrough done' },
  { id: 'closing', label: 'Closing package signed' }
]

export default function TransactionChecklist({ contract, onToggle }: TransactionChecklistProps) {
  const timeline = (contract.timeline as Record<string, boolean> | null) ?? {}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {defaultTasks.map((task) => {
          const done = Boolean(timeline[task.id])
          return (
            <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.label}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onToggle(task.id, !done)}>
                {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-400" />}
                <span className="sr-only">Toggle {task.label}</span>
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
