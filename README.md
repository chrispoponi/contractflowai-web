# ContractFlowAI Web

Vite + React single page app powered by Supabase Authentication, Database, Storage, and Edge Functions. All former Base44 integrations have been removed in favour of first-party Supabase resources.

## Prerequisites

Create a Supabase project and configure the following environment variables in a `.env` file at the project root:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_LOGIN_ROUTE=/Login           # optional override for the hosted login route
VITE_SUPABASE_STORAGE_CONTRACTS_BUCKET=contracts
VITE_SUPABASE_CONTRACTS_TABLE=contracts
VITE_SUPABASE_CLIENT_UPDATES_TABLE=client_updates
VITE_SUPABASE_ORGANIZATIONS_TABLE=organizations
VITE_SUPABASE_PROFILES_TABLE=profiles
```

> The default table/bucket names match the schema deployed in Supabase. Override them if your database uses different identifiers.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Support

For help provisioning Supabase resources or questions about ContractFlowAI, email `support@contractflowai.com`.