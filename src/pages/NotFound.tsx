import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
      <p className="text-sm uppercase tracking-wide text-slate-400">404</p>
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-slate-500">This route does not exist on the Cloudflare Pages deployment.</p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
