import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatsOverviewProps {
  title: string
  value: string
  icon: LucideIcon
  color: 'blue' | 'gold' | 'green' | 'indigo'
  isLoading?: boolean
}

const colorMap: Record<StatsOverviewProps['color'], string> = {
  blue: 'from-blue-500 to-blue-600',
  gold: 'from-[#c9a961] to-[#b8935a]',
  green: 'from-green-500 to-green-600',
  indigo: 'from-indigo-500 to-indigo-600'
}

export default function StatsOverview({ title, value, icon: Icon, color, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
          <div className={`rounded-xl bg-gradient-to-br ${colorMap[color]} p-3 text-white`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}
