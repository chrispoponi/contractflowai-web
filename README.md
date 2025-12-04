# ContractFlowAI

Fully typed Vite + React application backed by Supabase and deployed on Cloudflare Pages. Contracts, teams, organizations, and subscriptions all live inside Supabase tables with Row Level Security enforced on every query.

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file (or Cloudflare Pages project variables) with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_xxx
VITE_STRIPE_BUDGET_BUTTON_ID=buy_btn_xxx   # optional, overrides fallback
VITE_STRIPE_PRO_BUTTON_ID=buy_btn_xxx      # optional, overrides fallback
VITE_STRIPE_TEAM_BUTTON_ID=buy_btn_xxx     # optional, overrides fallback
```

## Supabase Edge Functions

Functions live in `supabase/functions/*` and cover timeline generation, file uploads, reminder automation, referrals, subscription renewals, counter-offer creation, and contract parsing.

## Deploying

1. `npm run build`
2. Deploy the `dist` output to Cloudflare Pages.
3. Deploy Supabase Edge Functions with `supabase functions deploy <name>`.
