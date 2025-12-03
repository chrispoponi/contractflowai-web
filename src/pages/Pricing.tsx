import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Zap, Building2, Users, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/providers/AuthProvider'

type Plan = {
  name: string
  price: string
  period: string
  description: string
  icon: typeof Users
  features: string[]
  tier: 'trial' | 'budget' | 'professional' | 'team'
  highlighted?: boolean
  ctaText: string
  stripeBuyButtonId?: string | null
}

const planDefinitions: Plan[] = [
  {
    name: 'Free Trial',
    price: '0',
    period: '60 Days',
    description: 'Perfect to get started',
    icon: Sparkles,
    features: ['First contract free', '60 days full access', 'AI analysis', 'Calendar tracking', 'Email reminders', 'No credit card'],
    tier: 'trial',
    ctaText: 'Start Free Trial',
    stripeBuyButtonId: null
  },
  {
    name: 'Budget',
    price: '9.99',
    period: 'month',
    description: 'For part-time agents',
    icon: Zap,
    features: ['2 contracts / month', 'AI analysis', 'Calendar tracking', 'Email reminders', 'Counter offers', 'Mobile optimized'],
    tier: 'budget',
    ctaText: 'Get Started',
    stripeBuyButtonId: import.meta.env.VITE_STRIPE_BUDGET_BUTTON_ID ?? 'buy_btn_1SGsHg0ONIDdV6FnDvFyVTX7'
  },
  {
    name: 'Professional',
    price: '49',
    period: 'month',
    description: '⭐ Most Popular - For full-time agents',
    icon: Building2,
    features: ['15 contracts / month', 'AI analysis', 'Calendar tracking', 'Custom reminders', 'Counter offers', 'Priority support'],
    tier: 'professional',
    highlighted: true,
    ctaText: 'Get Started',
    stripeBuyButtonId: import.meta.env.VITE_STRIPE_PRO_BUTTON_ID ?? 'buy_btn_1SGPxr0ONIDdV6FnqhxWOEDx'
  },
  {
    name: 'Team',
    price: '129',
    period: 'month',
    description: 'For brokerages & teams',
    icon: Users,
    features: ['Unlimited contracts', 'Up to 10 agents', 'Team dashboard', 'Shared calendar', 'Custom checklists', 'Account manager'],
    tier: 'team',
    ctaText: 'Get Started',
    stripeBuyButtonId: import.meta.env.VITE_STRIPE_TEAM_BUTTON_ID ?? 'buy_btn_1SGPcF0ONIDdV6Fn6cHvfTbd'
  }
]

export default function PricingPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [stripeLoaded, setStripeLoaded] = useState(false)
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder'

  const plans = useMemo(() => planDefinitions, [])

  useEffect(() => {
    if (!publishableKey) return
    if (document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]')) {
      setStripeLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/buy-button.js'
    script.async = true
    script.onload = () => setStripeLoaded(true)
    script.onerror = () => setStripeLoaded(false)
    document.body.appendChild(script)
  }, [publishableKey])

  const handleTrialStart = () => navigate('/signup')
  const handleSignIn = () => navigate('/login')

  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
          stripe-buy-button {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }
          
          @media (max-width: 768px) {
            stripe-buy-button {
              max-width: 100% !important;
            }
          }
        `}
      </style>

      <nav className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a5f]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ContractFlowAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSignIn} className="text-gray-600">
              Sign In
            </Button>
            <Button onClick={handleTrialStart} className="bg-[#1e3a5f] text-white hover:bg-[#2d4a6f]">
              Try Free
            </Button>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">Simple Pricing</h1>
        <p className="mt-4 text-lg text-gray-600">
          Choose the plan that fits your business. All plans include AI-powered contract management.
        </p>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative border-2 ${plan.highlighted ? 'border-[#1e3a5f] shadow-2xl lg:scale-105' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'}`}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[#1e3a5f] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader className="px-6 pb-6 pt-10 text-center">
              <div
                className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                  plan.highlighted ? 'bg-[#1e3a5f]' : 'bg-gray-100'
                }`}
              >
                <plan.icon className={`h-6 w-6 ${plan.highlighted ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-sm text-gray-500">/{plan.period}</span>
              </div>
              <div className="mt-6">
                {plan.tier === 'trial' ? (
                  <Button
                    onClick={handleTrialStart}
                    disabled={loading || user?.app_metadata?.subscription_tier === plan.tier}
                    className="w-full bg-black text-white hover:bg-gray-900"
                  >
                    {user?.app_metadata?.subscription_tier === plan.tier ? 'Current Plan' : plan.ctaText}
                  </Button>
                ) : plan.stripeBuyButtonId && stripeLoaded && publishableKey ? (
                  <stripe-buy-button buy-button-id={plan.stripeBuyButtonId} publishable-key={publishableKey}></stripe-buy-button>
                ) : (
                  <Button disabled className="w-full">
                    Loading...
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-10">
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">Everything you need to stay on track</h2>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: 'AI-Powered',
              copy: 'Automatically extract contract details in seconds with advanced AI technology.'
            },
            {
              icon: Check,
              title: 'Never Miss Dates',
              copy: 'Smart reminders for every deadline, customized to your workflow.'
            },
            {
              icon: Building2,
              title: 'Built for Agents',
              copy: 'Designed by a licensed agent who understands your daily challenges.'
            }
          ].map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
                <feature.icon className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] px-6 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="mt-4 text-lg text-blue-100">
          Start your free 60-day trial today. No credit card required. Try your first contract free!
        </p>
        <Button onClick={handleTrialStart} size="lg" className="mt-8 bg-white text-[#1e3a5f] hover:bg-gray-100">
          Start 60-Day Free Trial
        </Button>
      </section>

      <section className="border-t bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border-2 border-blue-100 bg-white p-8 shadow-lg">
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#c9a961] to-[#b8935a] text-2xl font-bold text-white">
                JP
              </div>
              <p className="text-lg text-gray-700 italic leading-relaxed">
                “As a licensed agent, I’ve used countless tools to manage my transactions. ContractFlowAI is the only one that
                actually keeps me organized without the headache. No more missed deadlines, no more scattered notes. Everything I
                need in one place.”
              </p>
              <div className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">Jackie Poponi</p>
                <p>Licensed Real Estate Agent</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-gray-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-center text-gray-600 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e3a5f]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">ContractFlowAI</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link to="/landing" className="hover:text-gray-900">
              Home
            </Link>
            <button onClick={handleSignIn} className="hover:text-gray-900">
              Sign In
            </button>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} ContractFlowAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
