import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <p className="text-sm uppercase tracking-wide text-indigo-600">Built on Supabase + Cloudflare Pages</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">
          ContractFlowAI helps teams close faster with secure storage, typed queries, and Edge Functions.
        </h1>
        <p className="mt-4 text-slate-500">
          Every request flows through Supabase Row Level Security, ensuring each user only sees their own contracts, teams, and organizations.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/pricing">Start for free</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Already using ContractFlowAI?</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
