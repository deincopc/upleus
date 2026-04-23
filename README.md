# Upleus

Uptime, SSL, domain, TCP, and heartbeat monitoring with instant email alerts and public status pages.

## Stack

- **Next.js** 16 (App Router)
- **Prisma** 7 + PostgreSQL
- **Clerk** — authentication
- **Resend** — transactional email
- **Vercel** — hosting + cron jobs

## Local development

```bash
cp .env.example .env.local
npm install
npx prisma migrate dev
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `RESEND_API_KEY` | Resend API key |
| `CRON_SECRET` | Bearer token for cron route auth |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. `https://upleus.com`) |
| `EMAIL_FROM` | From address for alert emails |

## Cron jobs

Configured in `vercel.json`:

- `/api/cron/checks` — runs every minute, executes all due monitor checks
- `/api/cron/monthly-report` — runs at 08:00 on the 1st of each month
