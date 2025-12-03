import { useEffect, useMemo } from 'react'
import { Users, Shield, Zap, Star, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Plan = {
  name: string
  headline: string
  price: string
  cadence: string
  description: string
  icon: typeof Users
  accent: string
  highlight?: boolean
  features: string[]
  stripeButtonId?: string
}

export default function Pricing() {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

  const plans: Plan[] = useMemo(
    () => [
      {
        name: 'Solo Agent',
        headline: 'Best for independent agents',
        price: '$49',
        cadence: 'per month',
        description: 'Everything you need to track contracts, clients, and reminders.',
        icon: Users,
        accent: 'from-[#eef2ff] to-[#e0e7ff]',
        features: ['Unlimited contract uploads', 'AI deadline extraction', 'Automated reminders', 'Client-ready PDF timelines'],
        stripeButtonId: import.meta.env.VITE_STRIPE_SOLO_BUTTON_ID
      },
      {
        name: 'Team',
        headline: 'Most popular',
        price: '$99',
        cadence: 'per month',
        description: 'Built for high-volume teams that need collaboration and automations.',
        icon: Shield,
        accent: 'from-[#e0f2ff] to-[#d0e3ff]',
        highlight: true,
        features: [
          'Everything in Solo',
          'Shared timelines & reminders',
          'Counter-offer workflow',
          'VIP onboarding + Slack support'
        ],
        stripeButtonId: import.meta.env.VITE_STRIPE_TEAM_BUTTON_ID
      },
      {
        name: 'Brokerage',
        headline: 'Custom solutions',
        price: 'Let’s talk',
        cadence: 'annual partnership',
        description: 'For brokerages that need advanced reporting, APIs, or internal tooling.',
        icon: Zap,
        accent: 'from-[#fff7ed] to-[#fffbeb]',
        features: ['White-glove migration', 'Role-based access controls', 'Custom analytics dashboards', 'Dedicated success manager']
      }
    ],
    []
  )

  useEffect(() => {
    if (!publishableKey) return
    if (document.getElementById('stripe-buy-button-script')) return
    const script = document.createElement('script')
    script.id = 'stripe-buy-button-script'
    script.src = 'https://js.stripe.com/v3/buy-button.js'
    script.async = true
    document.body.appendChild(script)
  }, [publishableKey])

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <section className="px-4 py-16 text-center sm:px-6 lg:px-8">
        <Badge className="mb-4 bg-slate-900 text-white">60-day free trial · No card required</Badge>
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
          Pricing that scales with your pipeline
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Every plan includes secure Supabase storage, Cloudflare Pages hosting, and white-label timelines for your clients.
        </p>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex h-full flex-col border-2 ${plan.highlight ? 'border-[#1e3a5f] shadow-xl shadow-blue-100' : 'border-slate-100'}`}
          >
            <CardHeader className="space-y-3">
              <div className={`inline-flex rounded-full bg-gradient-to-r ${plan.accent} p-3`}>
                <plan.icon className="h-5 w-5 text-slate-900" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                  <p className="text-sm text-slate-500">{plan.headline}</p>
                </div>
                {plan.highlight && (
                  <Badge className="bg-[#1e3a5f] text-white">Most popular</Badge>
                )}
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-900">{plan.price}</p>
                <p className="text-sm text-slate-500">{plan.cadence}</p>
              </div>
              <CardDescription className="text-base text-slate-600">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {plan.stripeButtonId && publishableKey ? (
                <stripe-buy-button buy-button-id={plan.stripeButtonId} publishable-key={publishableKey}></stripe-buy-button>
              ) : (
                <Button size="lg" className="w-full" onClick={() => (plan.name === 'Brokerage' ? (window.location.href = 'mailto:sales@contractflowai.com') : window.location.assign('/signup'))}>
                  {plan.name === 'Brokerage' ? 'Talk to sales' : 'Start 60-day trial'}
                </Button>
              )}
              {plan.name !== 'Brokerage' && (
                <p className="text-center text-xs text-slate-500">Cancel anytime during the trial—no credit card required.</p>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="border-t border-slate-100 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              title: 'Stripe-secured checkout',
              copy: 'Every plan uses Stripe’s new buy buttons—PCI compliant, SCA ready, and embeddable anywhere.'
            },
            {
              title: 'Supabase-first support',
              copy: 'Need RLS tuning or storage migrations? We include Supabase DBA support in Team and Brokerage plans.'
            },
            {
              title: 'Cloudflare-native performance',
              copy: 'Static hosting on Cloudflare Pages with Edge Functions for real-time reminders, parsing, and referrals.'
            }
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
