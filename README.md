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

Stripe webhooks should target your Supabase Edge Function, e.g.:

```
https://uehjpftyvycbrketwhwg.supabase.co/functions/v1/stripe-webhook
```

Supabase Edge Function secrets (configured in Supabase project settings or `supabase/functions/.env` when testing locally):

```
SUPABASE_URL=https://uehjpftyvycbrketwhwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

When creating Stripe Buy Buttons / Checkout Sessions be sure to include metadata:

- `supabase_user_id`: the UUID of the user purchasing
- `plan`: one of `trial`, `budget`, `professional`, `team` (or whichever labels you map to Supabase)

That metadata lets the webhook map payments back to Supabase rows automatically.

## Supabase Edge Functions

Functions live in `supabase/functions/*` and cover timeline generation, file uploads, reminder automation, referrals, subscription renewals, Stripe webhooks, counter-offer creation, and contract parsing.

## Deploying

1. `npm run build`
2. Deploy the `dist` output to Cloudflare Pages.
3. Deploy Supabase Edge Functions with `supabase functions deploy <name>`.
