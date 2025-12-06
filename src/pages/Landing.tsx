import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Calendar, CheckCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/components/providers/AuthProvider'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth() ?? {}

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard')
      return
    }
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('code') || urlParams.get('ref')
    if (refCode) {
      sessionStorage.setItem('pending_ref_code', refCode)
    }
    navigate('/pricing')
  }

  const handleSignIn = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ContractFlowAI</p>
              <p className="text-base font-semibold text-slate-900">Agent Co-pilot</p>
            </div>
          </div>
          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <Link to="/pricing" className="hover:text-slate-900">
              Pricing
            </Link>
            <a href="#benefits" className="hover:text-slate-900">
              Benefits
            </a>
            <a href="#how-it-works" className="hover:text-slate-900">
              How it works
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSignIn}>
              Sign In
            </Button>
            <Button onClick={handleGetStarted} className="bg-indigo-600 hover:bg-indigo-700">
              Try It Free
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="absolute inset-0 opacity-40 blur-3xl">
          <div className="mx-auto h-96 w-96 rounded-full bg-gradient-to-r from-indigo-200 to-sky-100"></div>
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              AI timeline concierge for agents
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Delegate contract dates to AI, keep clients confident, and win back hours each week.
            </h1>
            <p className="text-lg text-slate-600">
              Upload a PDF and ContractFlowAI extracts every critical milestone, pushes it to your calendar and phone, and shares branded timelines your clients rave about.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="flex-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-base shadow-lg hover:from-indigo-700 hover:to-sky-600 sm:flex-none"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="flex-1 text-base sm:flex-none" onClick={() => navigate('/pricing')}>
                See plans
              </Button>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white/70 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Agents onboarded</span>
                <strong className="text-lg text-slate-900">320+</strong>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Deadlines tracked automatically</span>
                <strong className="text-lg text-slate-900">12,400+</strong>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Time saved per contract</span>
                <strong className="text-lg text-emerald-600">4.5 hrs avg</strong>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">AI summary preview</p>
                  <p className="text-2xl font-semibold text-slate-900">118 W Seaside Way</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
              </div>
              <ul className="space-y-4 text-sm text-slate-600">
                {[
                  'Inspection deadline surfaced + synced to Google Calendar.',
                  'AI summary highlights financing timeline in plain English.',
                  'Clients receive branded timeline email automatically.'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 p-4 text-sm text-white shadow-lg">
                “A real estate assistant that never sleeps. I forward a contract and the system handles the dates, clients, and reminders.” — Jackie P.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Stay On Track</h2>
            <p className="text-xl text-gray-600">Built specifically for real estate agents who hate missing deadlines</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'AI Contract Upload',
                description: 'Upload any contract PDF and our AI automatically extracts all dates, parties, and terms in seconds.',
                bullets: ['Inspection, appraisal, closing dates', 'Buyer/seller contact info', 'Counter offer tracking']
              },
              {
                icon: Bell,
                title: 'Smart Reminders',
                description: 'Never miss a deadline with automated email reminders customized to your preferences.',
                bullets: ['7, 3, 1 day alerts (customizable)', 'Overdue date warnings', 'Skip completed milestones']
              },
              {
                icon: Calendar,
                title: 'Visual Calendar',
                description: 'See all your transactions at a glance. Color-coded by milestone type, sorted by urgency.',
                bullets: ['All contracts in one view', 'Export to Google/Apple Calendar', 'Bulk email client timelines']
              }
            ].map(({ icon: Icon, title, description, bullets }) => (
              <Card key={title} className="border-2 hover:border-[#1e3a5f] transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#1e3a5f]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                  <p className="text-gray-600 mb-4">{description}</p>
                  <ul className="space-y-2">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 text-white" id="how-it-works">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {[
            {
              step: 'Step 1',
              title: 'Upload any PDF',
              copy: 'Drag & drop. We detect purchase price, contingencies, counter offers, and client info.'
            },
            {
              step: 'Step 2',
              title: 'AI builds your checklist',
              copy: 'We normalize dates, fill missing deadlines, and flag anything that needs attention.'
            },
            {
              step: 'Step 3',
              title: 'Share timelines & automate updates',
              copy: 'Push to Google/Apple Calendar, send branded client timelines, and let reminders run in the background.'
            }
          ].map(({ step, title, copy }) => (
            <Card key={title} className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardContent className="space-y-3 p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">{step}</span>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-sm text-white/80">{copy}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-blue-100">
            <div className="mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#c9a961] to-[#b8935a] rounded-full mx-auto flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-2xl">JP</span>
              </div>
            </div>
            <p className="text-base sm:text-lg text-gray-700 italic mb-4 sm:mb-6 leading-relaxed">
              "As a licensed agent, I've used countless tools to manage my transactions. ContractFlowAI is the only one that actually keeps me organized without the headache. No more missed deadlines, no more scattered notes. Everything I need in one place."
            </p>
            <div className="border-t border-gray-200 pt-4">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Jackie Poponi</p>
              <p className="text-xs sm:text-sm text-gray-600">Licensed Real Estate Agent</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Stop Missing Deadlines?</h2>
          <p className="text-xl text-gray-600 mb-8">Start your 60-day free trial. No credit card required.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white px-8 py-6 text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">ContractFlowAI</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link to="/privacy" className="hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link to="/pricing" className="hover:text-gray-900">
                Pricing
              </Link>
              <button onClick={handleSignIn} className="hover:text-gray-900">
                Sign In
              </button>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">© 2025 ContractFlowAI. All rights reserved. Built for real estate professionals.</div>
        </div>
      </footer>
    </div>
  )
}
