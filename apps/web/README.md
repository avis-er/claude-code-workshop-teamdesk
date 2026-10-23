# web

A [TanStack Start](https://tanstack.com/start) app deployed on Cloudflare Workers, with [Hono](https://hono.dev) as the top-level `fetch` handler and [Cloudflare D1](https://developers.cloudflare.com/d1/) for data.

Clerk handles sign-in. The server verifies each request and matches the user's primary verified email to a team member. Public queries remain available to everyone. Mutations require a matching member; signed-in nonmembers are read-only.

## Architecture

`src/server.ts` is the Worker's entry point (`main` in `wrangler.jsonc`). It's a Hono app:

- Hono handles its own routes first (e.g. `/api/health`).
- `/api/trpc/*` is the [tRPC](https://trpc.io) API, mounted with `@hono/trpc-server`.
- Everything else falls through to `app.all('*', ...)`, which delegates to TanStack Start's request handler (`@tanstack/react-start/server-entry`) for SSR pages and static assets.

## tRPC

`src/server/trpc/` holds the API:

- `context.ts` verifies the Clerk session and builds `ctx` with services on this request's `drizzle(env.DB)` and the signed-in user id or null.
- `init.ts` defines `publicProcedure` (anyone), `protectedProcedure` (signed-in users), and `memberProcedure` (a signed-in user whose primary verified email matches a member). They map service errors to tRPC errors.
- `router.ts` is the app router: one sub-router per area (`members`, `rooms`, `bookings`, `tasks`, `announcements`, `notes`) and `me` (protected, the example).
- `routers/<name>.ts` holds one router per area. Keep them thin: an input schema from the service, then one service call.

`src/integrations/trpc/client.ts` exports `getTrpc()`. In the browser it is an HTTP client for `/api/trpc`. During SSR it runs the router in-process (`unstable_localLink`), so loaders do not fetch their own Worker. Call it from loaders and event handlers: `getTrpc().notes.list.query()`.

## D1

Database access goes through the workspace package [`@repo/db`](../../packages/db) (see its README for the schema, the migrations and the test setup). In this app:

- `wrangler.jsonc` declares the `d1_databases` binding named `DB`, with `migrations_dir` pointing at `packages/db/migrations`. `bun run cf-typegen` turns that into `env.DB: D1Database`.
- `src/server/trpc/context.ts` calls `drizzle(env.DB)` from `drizzle-orm/d1` and hands it to the services. That is the one place the binding is read.
- `src/routes/notes.tsx` is the example page: the loader calls `notes.list`, the form calls `notes.create` and invalidates the router. Its `errorComponent` renders a "could not reach D1" panel.
- Browser code imports only `@repo/db/shared`. The other entries import drizzle and belong behind tRPC.

`bun run dev` runs `wrangler d1 migrations apply DB --local` before starting Vite, so the local database that Miniflare serves is always up to date. It lives in `.wrangler`, which is gitignored; delete that folder for a clean slate.

## Develop

```bash
bun install
bun run dev
```

Copy `.dev.vars.example` to `.dev.vars` and replace `sk_test_replace_me` with the Clerk secret key. The publishable key is already configured in `wrangler.jsonc`. Configure `http://localhost:3000` as an allowed development origin and redirect URL in the Clerk dashboard.

## Build & deploy

The local database only exists on your machine, so the deployed Worker needs a real D1 database. Create one, put the id it prints into `d1_databases[0].database_id` in `wrangler.jsonc`, then create the tables and load the demo data:

```bash
bunx wrangler d1 create teamdesk
bun run db:apply:remote   # apply the migrations to the remote database
bun run db:seed:remote    # load packages/db/seed.sql (safe to re-run)
```

Without the demo data the deployed app has no members, so nobody can book. `bun run db:apply` and `bun run db:seed` do the same for the local database; `bun run dev` runs both before it starts.

Then:

```bash
cd apps/web && bunx wrangler secret put CLERK_SECRET_KEY
bun run build     # vite build
bun run deploy    # build + wrangler deploy
```

The checked-in `pk_test` key is for Clerk's development instance. For a production deployment, create a Clerk production instance and replace the publishable key in `wrangler.jsonc` and `src/routes/__root.tsx` with its `pk_live` key. Set `CLERK_SECRET_KEY` to that instance's matching secret with the command above. Configure the deployed domain and sign-in redirects in the Clerk dashboard before deploying.

`wrangler.jsonc` has no `account_id` set, so `wrangler deploy`/`wrangler whoami` will use (or prompt for) whichever Cloudflare account is active.

`bun run cf-typegen` regenerates `worker-configuration.d.ts` (the `Env` type) from `wrangler.jsonc` + local env vars — it also runs automatically via `prepare` (`bun install`), so a fresh clone typechecks without a manual step.
