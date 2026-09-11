# Date Night Roulette 🎲

A tiny two-person web app for deciding where to eat on Friday date nights.
We keep a shared list of restaurants we want to try (usually shared from
Google Maps); spinning picks one uniformly at random, and the outcome — went,
skipped, spin again — updates the list for next time.

Built for exactly two people behind one shared passphrase. See
[`CONTEXT.md`](./CONTEXT.md) for the vocabulary used throughout the code:
**Restaurant**, **the Pool**, **Benched**, **Visit**, **Spin**.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Neon](https://neon.tech) Postgres via [Drizzle ORM](https://orm.drizzle.team)
  (`neon-http` driver)
- Tailwind CSS v4
- Deployed on [Vercel](https://vercel.com) (Hobby plan)

> **Note for future Claude/agents:** this repo's `AGENTS.md` warns that this
> Next.js version has breaking changes vs. training data (`proxy.ts`, async
> `cookies()`/`params`, etc.) — read `node_modules/next/dist/docs/` before
> touching Next APIs.

## Prerequisites

- Node 20+ and [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com/) (Compose v2), for the local database

## Local development

```bash
pnpm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in the three secrets it leaves blank:

- `APP_PASSPHRASE` — whatever you want to type at `/login`
- `AUTH_SECRET` — generate one: `openssl rand -hex 24`
- `INTAKE_TOKEN` — another random value, e.g. `openssl rand -hex 24`

The two `DATABASE_URL*` values are already filled in with a working local
default — leave them as-is unless you changed `docker-compose.yml`.

Then bring up the database and start the app:

```bash
pnpm db:up     # starts Postgres + the local Neon proxy, waits for healthy
pnpm db:push   # creates the restaurants / visits / spins tables
pnpm dev       # http://localhost:3000
```

Log in with your `APP_PASSPHRASE`. There's no seed data — add a restaurant via
`/add` (paste a Google Maps share link, or skip and type it in by hand).

### How the local database works

`db/index.ts` talks to Postgres through `@neondatabase/serverless`, which
speaks **Neon's SQL-over-HTTP protocol** — not the plain Postgres wire
protocol a bare `postgres` container understands. `docker-compose.yml` runs a
small translation proxy, [`local-neon-http-proxy`][proxy], in front of a
regular Postgres container, so **the app itself** exercises the *exact same
driver and code path* as production Neon — no `if (dev)` branching in
`db/index.ts`.

[proxy]: https://github.com/TimoWilhelm/local-neon-http-proxy

The proxy expects the database host to be `db.localtest.me`, not `localhost`
— that hostname is used for the proxy's internal TLS handshake and resolves
to `127.0.0.1` over public DNS. If you're working fully offline, add this line
to your hosts file (`/etc/hosts` on macOS/Linux):

```
127.0.0.1 db.localtest.me
```

Postgres itself is published on host port **5433**, not the default 5432 —
5432 is commonly already taken by another local project's Postgres, and on at
least one machine we tested, a silent port conflict there kept the container
from attaching to the compose network at all. Container-to-container traffic
(the proxy talking to Postgres) is unaffected either way.

**`drizzle-kit push`/`studio` don't go through the proxy at all.** They use a
different, websocket-based sub-driver of `@neondatabase/serverless` that has
its own independent connection config — reconfiguring it to work through the
proxy runs straight into a
[dual-package hazard](https://nodejs.org/api/packages.html#dual-package-hazard)
in that library (it ships separate CJS and ESM bundles, each with its own
`neonConfig` state, and `drizzle-kit`'s CLI loads one while our config loads
the other). Rather than fight that, this repo adds `pg` as a devDependency —
`drizzle-kit` checks for `pg` before `@neondatabase/serverless` and, when
present, uses the plain `node-postgres` driver instead: an ordinary TCP client
with no such hazard. That's why `DATABASE_URL_UNPOOLED` points at port
**5433** (Postgres's actual published port) while `DATABASE_URL` points at
port 4444 (the proxy) — they're deliberately different, and each is correct
for how it's actually used. `pg` is never imported by app code; it exists
solely for `drizzle-kit`'s own tooling, both locally and against production
(Neon's unpooled endpoint is an ordinary Postgres port too).

Everyday commands:

| Command | What it does |
|---|---|
| `pnpm db:up` | Start Postgres + the proxy (idempotent) |
| `pnpm db:down` | Stop them, keep the data volume |
| `pnpm db:reset` | Stop them **and delete all local data**, then start fresh |
| `pnpm db:push` | Push `db/schema.ts` to the local database (no migration files — see below) |
| `pnpm db:studio` | Open [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) against the local database |

**Why `pnpm db:push` isn't just `drizzle-kit push`:** `drizzle-kit` only reads
a plain `.env` file, never `.env.local` — so the scripts above explicitly load
it via `node --env-file=.env.local`. Using the bare `drizzle-kit` CLI directly
will silently fall through to the placeholder connection string.

We don't use versioned migrations (`drizzle-kit generate`) — for a two-person
app, migration ceremony nobody will ever read isn't worth it. `db:push`
diffs `db/schema.ts` against the live database and applies the difference
directly.

### Testing the intake endpoint

`/api/intake` is the endpoint the iOS Shortcut posts to (see below). It's
exempt from the passphrase gate and instead checks an `X-Intake-Token` header:

```bash
# 401 — wrong/missing token
curl -i -X POST http://localhost:3000/api/intake \
  -H 'Content-Type: application/json' \
  -H 'X-Intake-Token: wrong' \
  -d '{"url":"https://maps.app.goo.gl/example"}'

# 200 — correct token + a resolvable Maps link
curl -i -X POST http://localhost:3000/api/intake \
  -H 'Content-Type: application/json' \
  -H "X-Intake-Token: $(grep ^INTAKE_TOKEN= .env.local | cut -d= -f2)" \
  -d '{"url":"<a real maps.app.goo.gl link you shared>"}'
```

A successful call inserts a restaurant with `cuisine: "unknown"`, which
surfaces as a "needs a cuisine" nudge on the spin screen.

`url` may be a bare link or the share sheet's `"<title>\n<link>"` blob — a
title found there wins, since it needs no guessing. An optional `name` field
overrides both, and is the only thing that can rescue a link carrying no name
at all (a dropped pin).

The URL-parsing itself is unit-tested — `pnpm test` — against a table of real
Google Maps URL shapes. **Add a case there rather than re-deriving one by
hand**, because the shapes are not obvious. Notably an iOS share resolves to
`maps.google.com/maps?q=<Name>, <address>&ftid=…` and *never* to the
`/maps/place/<name>` form a desktop share produces, so the name has to be read
out of the `q=` parameter and split off its address. A dropped pin instead
arrives as coordinates, a plus code or DMS, all of which are rejected.

One gotcha if you ever debug the resolver by hand: sending a browser
`User-Agent` makes Google answer with a `consent.google.com` interstitial
instead of a redirect. Node's default agent gets the clean chain, so the
resolver deliberately sets no `User-Agent`.

## Deploying to Vercel

1. Push this repo to GitHub, then either import it at
   [vercel.com/new](https://vercel.com/new) or use the CLI:
   ```bash
   pnpm dlx vercel link
   ```
2. Provision a database: `pnpm dlx vercel install neon --plan free`. This
   injects real `DATABASE_URL` / `DATABASE_URL_UNPOOLED` values into the
   Vercel project — no local `docker-compose` proxy needed in production,
   since Vercel's Neon *is* the real Neon HTTP endpoint.
3. In the Vercel project's environment variables, set `APP_PASSPHRASE`,
   `AUTH_SECRET`, and `INTAKE_TOKEN` (use different values than local dev).
4. Pull the production env vars locally and push the schema to the real
   database once:
   ```bash
   pnpm dlx vercel env pull .env.production.local
   pnpm db:push:prod
   ```
5. Deploy: `pnpm dlx vercel deploy --prod` (or just push to your production
   branch, if the Vercel GitHub integration is connected).

## The iOS Shortcut

Google Maps' share sheet doesn't support iOS's Web Share Target API (Apple
has no plans to add it), so a Shortcut fills the gap — it can appear directly
in Maps' share sheet and POST to `/api/intake` without needing the app's
passphrase cookie (the Shortcut carries no cookies at all; that's why the
intake route uses its own header token instead).

Set this up once **per phone**:

1. **Shortcuts app → New Shortcut → (i) Details**
   - Enable **Show in Share Sheet**
   - Set **Share Sheet Types** to **URLs and Text** (Maps shares often arrive
     as a title + URL blob, not a bare URL)
2. Add action **Get Contents of URL**:
   - URL: `https://<your-vercel-domain>/api/intake`
   - Method: `POST`
   - Headers: `X-Intake-Token` → your production `INTAKE_TOKEN`
   - Request Body: JSON → `{ "url": Shortcut Input }`
   - Optional but worth doing: add a second JSON field `name`, set to the
     **Name** property of the `Shortcut Input` variable (tap the variable, then
     pick *Name*). Maps usually hands the place's title over as that property,
     and using it skips the URL-guessing entirely. Everything works without
     this — it's just the most reliable source of a name.
3. Add action **Show Notification** at the end, showing the response — so a
   failure (bad link, wrong token) is never silent.
4. Optional: in Maps' share sheet, tap **Edit Actions** and pin the shortcut
   near the top.

Test it by sharing a real restaurant from Google Maps — this is the only true
end-to-end test of the intake path.

## Add to home screen

The app is a installable PWA (standalone display, no offline support). Each
of Safari and a home-screen install keep **separate cookie jars**, so you'll
enter the passphrase once in Safari and once more after installing — that's
expected, not a bug. The login cookie is set server-side (not via JS) on
purpose: Safari's Intelligent Tracking Prevention caps script-written cookies
at ~7 days, while an HTTP-set cookie can last the full ~400 days configured
here.

## Environment variables

| Variable | Purpose | Local default | Production |
|---|---|---|---|
| `DATABASE_URL` | Pooled Postgres connection (app runtime) | Points at the local `neon-proxy` container, port 4444 | Injected by `vercel install neon` |
| `DATABASE_URL_UNPOOLED` | Unpooled connection (`drizzle-kit push`/`studio`, via `pg`) | Points straight at Postgres, port 5433 | Injected alongside `DATABASE_URL` |
| `APP_PASSPHRASE` | The shared passphrase typed at `/login` | Set your own | Set your own (different value) |
| `AUTH_SECRET` | HMAC key for the auth cookie's value | Set your own | Set your own (different value) |
| `INTAKE_TOKEN` | Bearer-style token the iOS Shortcut sends | Set your own | Set your own (different value) |

## Project layout

```
app/
  page.tsx, tumble.tsx      # spin screen + the tumble animation
  add/                      # paste-a-link intake form
  restaurants/              # the Pool, and each restaurant's detail page
  benched/                  # benched restaurants, with restore
  login/                    # passphrase form
  api/intake/               # token-authenticated endpoint for the iOS Shortcut
  manifest.ts               # PWA manifest
db/                         # Drizzle schema + client
lib/                        # auth, cuisines list, Maps-link resolver, server actions
proxy.ts                    # auth gate (Next's middleware equivalent)
design/spin-mechanics.html  # prototype of the three spin mechanics considered
CONTEXT.md                  # domain glossary — read this before changing behaviour
```
