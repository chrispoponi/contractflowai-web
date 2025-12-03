export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed text-slate-600">
      <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
      <p className="mt-4">
        ContractFlowAI stores data exclusively inside Supabase. Row Level Security ensures every request scopes to the authenticated
        `auth.uid()` so users only see their own `users`, `contracts`, `teams`, `team_members`, `organizations`, and `user_subscriptions`
        rows. Files are held in storage buckets (`contracts`, `counter_offers`, `summaries`, `uploads`) with signed URLs that expire
        after 60 seconds.
      </p>
      <p className="mt-4">
        Authentication uses Supabase Auth magic links plus optional OAuth providers (Google, Apple). Sessions persist inside the
        browser and are refreshed on every mount to guarantee validity. All API calls run through Cloudflare Pages Edge, making sure
        latency stays low across regions.
      </p>
      <p className="mt-4">Contact support@contractflow.ai for questions.</p>
    </div>
  )
}
