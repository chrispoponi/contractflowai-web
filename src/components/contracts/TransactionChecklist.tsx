import type { Tables } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle } from 'lucide-react'

interface TransactionChecklistProps {
  contract: Tables<'contracts'>
  onToggle: (field: ChecklistField, nextValue: boolean) => Promise<void>
}

const tasks = [
  { field: 'inspection_completed', label: 'Inspection complete' },
  { field: 'inspection_response_completed', label: 'Inspection response sent' },
  { field: 'appraisal_completed', label: 'Appraisal received' },
  { field: 'loan_contingency_completed', label: 'Loan contingency cleared' },
  { field: 'final_walkthrough_completed', label: 'Final walkthrough done' },
  { field: 'closing_completed', label: 'Closing package signed' }
] as const

type ChecklistField = (typeof tasks)[number]['field']

export default function TransactionChecklist({ contract, onToggle }: TransactionChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const done = Boolean(contract[task.field] as boolean | null)
          return (
            <div key={task.field} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.label}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onToggle(task.field, !done)}>
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

export type { ChecklistField }
