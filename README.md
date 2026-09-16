# D-Dera's Essentials

Home-visit massage booking for **D-Dera's Essentials** (Lagos). Clients pick a session, fill a short intake, and send it in. Two ambassador seats run Studio: bookings, photos, vault backups, and visit confirmation.

**Live source:** [github.com/Dev-OLAOLU/dderas-essentials](https://github.com/Dev-OLAOLU/dderas-essentials)

## What ships

- Public site + session builder and 4-step intake
- Optional client photos (entrance / deposit)
- Studio dashboard (ambassador sign-in)
- Booking photos, version history, and vault snapshots
- WhatsApp confirmation links
- Postgres (Neon in production)

## Studio access

Studio is capped at **two ambassador seats**. First two people to create an account own it. Sign in with **email and password** on the live site.

Google / X sign-in is for the Grok preview only. Do not rely on those buttons on your own domain unless you later add your own OAuth app.

## Deploy (GitHub → Vercel)

1. This repo is the source of truth.
2. Import it in Vercel (Framework Prefab: leave auto, or set Build Command `npm run build`).
3. Set these **environment variables** (Production + Preview):

| Variable | Why |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled is fine) |
| `BETTER_AUTH_SECRET` | Long random string. Sessions break on every deploy if this is missing |
| `BETTER_AUTH_URL` | Public site URL, e.g. `https://your-app.vercel.app` |
| `VITE_AUTH_ENABLED` | `true` |

4. Deploy. The first build applies SQL in `migrations/` when `DATABASE_URL` is set.
5. Open `/login`, claim the first ambassador seat, then book a test session from `/book`.

### Neon

Create a project at [neon.tech](https://neon.tech), copy the connection string into `DATABASE_URL`, and redeploy. Tables are created by the migration files in this repo — you do not create them by hand.

## Local notes

`npm install` then `npm run dev`. Without `DATABASE_URL` the app uses an in-memory database that resets when the process stops.

## Stack

TanStack Start, React 19, Tailwind v4, Better Auth, Postgres (Neon / PGLite).
