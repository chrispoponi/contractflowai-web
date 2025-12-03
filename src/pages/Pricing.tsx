import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

const plans = [
  {
    name: 'Starter',
    price: '$29/mo',
    features: ['Unlimited uploads', 'Supabase storage buckets', 'Magic link auth']
  },
  {
    name: 'Professional',
    price: '$49/mo',
    features: ['Edge Functions automation', 'AI parsing credits', 'Team management']
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Dedicated Cloudflare Pages region', '24/7 support', 'Custom RLS policies']
  }
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="grid gap-6 px-4 py-12 lg:grid-cols-3 lg:px-12">
      {plans.map((plan) => (
        <Card key={plan.name} className="flex flex-col">
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <p className="text-2xl font-semibold">{plan.price}</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <ul className="space-y-2 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" onClick={() => navigate('/auth/register')}>
              Get started
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
