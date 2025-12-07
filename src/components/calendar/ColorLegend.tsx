import { Card } from '@/components/ui/card'

const legendItems = [
  { label: 'Inspection', className: 'bg-blue-500' },
  { label: 'Inspection Response', className: 'bg-purple-500' },
  { label: 'Loan Contingency', className: 'bg-orange-500' },
  { label: 'Appraisal', className: 'bg-green-500' },
  { label: 'Final Walkthrough', className: 'bg-indigo-500' },
  { label: 'Closing', className: 'bg-red-500' },
  { label: 'Completed (faded)', className: 'bg-gray-300 opacity-50' },
  { label: 'Using original contract dates', className: 'bg-blue-100 border border-blue-400' },
  { label: 'From counter offer', className: 'bg-yellow-100 border border-yellow-400' }
]

export function ColorLegend() {
  return (
    <Card className="rounded-xl border p-6 shadow-sm">
      <div className="flex flex-wrap gap-4">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center text-sm text-slate-600">
            <span className={`mr-2 inline-block h-4 w-4 rounded-md ${item.className}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ColorLegend
