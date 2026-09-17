# D-Dera's Essentials

Home-visit massage booking for **D-Dera's Essentials** (Lagos). Clients pick a session, fill a short intake, and send it in. Two ambassador seats run Studio: bookings, photos, vault backups, and visit confirmation.

**Live source:** [github.com/Dev-OLAOLU/dderas-essentials](https://github.com/Dev-OLAOLU/dderas-essentials)

## Operations loop

1. Client (phone or laptop) builds a session and sends the intake.
2. The booking is stored on the Studio desk and emailed to Chidera (`chideraal29@gmail.com`) plus the second administrator inbox.
3. Chidera sets transport, then **Accept & send quote**.
4. The client quote page updates live. If they left an email, they get the service + transport amounts. WhatsApp still carries the same quote.
5. The client chooses **pay complete visit** or **pay service + transport**. Studio is emailed that choice. Transfer is confirmed on WhatsApp.

## What ships

- Public site + session builder and 4-step intake
- Optional client photos (entrance / deposit)
- Studio dashboard (ambassador sign-in)
- Booking photos, version history, and vault snapshots
- Quote page with payment choice
- WhatsApp confirmation links
- Postgres (Neon in production)

## Studio access

Studio is capped at **two ambassador seats**. First two people to create an account own it. Sign in with **email and password** on the live site.

Google / X sign-in is for the Grok preview only. Do not rely on those buttons on your own domain unless you later add your own OAuth app.

## Deploy (GitHub → Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Dev-OLAOLU/dderas-essentials)

1. This repo is the source of truth.
2. Import it in Vercel with the button above, or from [vercel.com/new](https://vercel.com/new) → GitHub → `dderas-essentials`.
3. Set these **environment variables** (Production + Preview):

| Variable | Why |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled is fine) |
| `BETTER_AUTH_SECRET` | Long random string. Sessions break on every deploy if this is missing |
| `BETTER_AUTH_URL` | Public site URL, e.g. `https://your-app.vercel.app` |
| `VITE_AUTH_ENABLED` | `true` |

4. Deploy. The first build applies SQL in `migrations/` when `DATABASE_URL` is set.
5. Open `/login`, claim the first ambassador seat, then book a test session from `/book`.
6. Confirm the first FormSubmit message in Chidera’s inbox (and the second admin inbox) so booking emails start arriving.

### Neon

Create a project at [neon.tech](https://neon.tech), copy the connection string into `DATABASE_URL`, and redeploy. Tables are created by the migration files in this repo — you do not create them by hand.

## Local notes

`npm install` then `npm run dev`. Without `DATABASE_URL` the app uses an in-memory database that resets when the process stops.

## Stack

TanStack Start, React 19, Tailwind v4, Better Auth, Postgres (Neon / PGLite).
