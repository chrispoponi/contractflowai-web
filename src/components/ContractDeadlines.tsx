import { CheckCircle2, Circle } from 'lucide-react'
import { formatDate } from '@/utils/formatDate'

type Deadline = {
  label: string
  date: string | null
  completed: boolean
}

interface ContractDeadlinesProps {
  deadlines: Deadline[]
}

export function ContractDeadlines({ deadlines }: ContractDeadlinesProps) {
  if (!deadlines || deadlines.length === 0) {
    return <p className="text-sm text-slate-500">No deadlines extracted yet.</p>
  }

  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => (
        <div
          key={deadline.label}
          className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{deadline.label}</p>
            <p className="text-xs text-slate-500">{formatDate(deadline.date)}</p>
          </div>
          {deadline.completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Completed" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300" aria-label="Pending" />
          )}
        </div>
      ))}
    </div>
  )
}

export default ContractDeadlines
