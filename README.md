# Secret Pioneers

Det digitale hjemmet og arbeidsrommet til Secret Pioneers.

## Lokal oppstart

Krever Node.js 22+ og pnpm 11+.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY` er koblet til det
delte Secret Pioneers-prosjektet i Supabase. Produksjonsbygget får de samme
offentlige klientverdiene fra GitHub Actions-variabler; de er ikke
hemmeligheter. Ikke legg inn `service_role`, databasepassord eller andre
hemmeligheter i `.env.local` eller GitHub Actions-variabler.

## Kvalitet

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

## Deployment

En push til `main` kjører kvalitetssjekker og publiserer den statiske klienten
til GitHub Pages. Appen er bevisst statisk; autentisering, database, filer og
serverprivilegier skal ligge i Supabase.

Se [utviklingsplanen](docs/UTVIKLINGSPLAN.md) for produkt- og
arkitekturbeslutninger.
