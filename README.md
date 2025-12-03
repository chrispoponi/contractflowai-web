# ContractFlowAI Web

ContractFlowAI is a Vite + React application that now runs entirely on Supabase for authentication, database access, storage, and edge functions.

## Environment configuration

Create a `.env.local` (or `.env`) file with the following variables:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_SUPABASE_STORAGE_BUCKET=contracts # or the bucket name you created
VITE_SUPABASE_AUTH_PROVIDER=google      # google, github, etc. Optional, defaults to google
```

Make sure the Supabase project has:

- `profiles`, `contracts`, `referrals`, `client_updates`, `organizations` tables
- Storage bucket that matches `VITE_SUPABASE_STORAGE_BUCKET`
- Edge Functions for:
  - `extractContractData`
  - `verifyContractData`
  - `summarizeContract`
  - `generateClientTimeline`
  - `sendClientEmail`
  - `processReferral`
  - `sendDailyReminders`
  - `deleteUserAccount` (invoked for admin user deletion)

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```