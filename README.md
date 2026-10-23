# Teamdesk

Rooms, bookings and tasks for a small team. A [TanStack Start](https://tanstack.com/start) app on Cloudflare Workers with D1, built from [cf-tanstack-boilerplate](https://github.com/codewithpassion/cf-tanstack-boilerplate).

## Develop

```bash
bun install
bun test
bun run dev
```

Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars` and replace the placeholder with your Clerk secret key. `bun run dev` applies the D1 migrations and demo data (`packages/db/seed.sql`) to a local SQLite database and starts the app on http://localhost:3000. The local database lives in `apps/web/.wrangler`; delete that folder for a clean slate.

Anyone can view pages. To make changes, sign in with Clerk using a primary verified email that matches a team member. The server resolves the acting member; signed-in users who are not members have read-only access.

The checked-in `pk_test` publishable key is for Clerk's development instance. For production, create a Clerk production instance, replace the publishable key in `apps/web/wrangler.jsonc` and `apps/web/src/routes/__root.tsx` with its `pk_live` key, and set the matching Worker secret with `cd apps/web && bunx wrangler secret put CLERK_SECRET_KEY`. Configure the deployed domain and sign-in redirects in the Clerk dashboard before deploying.

## Layout

- [`apps/web`](apps/web): the TanStack Start app. Hono is the Worker's `fetch` handler, tRPC is mounted at `/api/trpc`. See its [README](apps/web/README.md).
- [`packages/db`](packages/db) (`@repo/db`): the Drizzle schema, migrations and query functions. See its [README](packages/db/README.md).
- [`packages/services`](packages/services) (`@repo/services`): business rules and validation on top of `@repo/db`. See its [README](packages/services/README.md).

A request goes route component, then tRPC router (`apps/web/src/server/trpc/routers/`), then service (`@repo/services/<module>`), then query functions (`@repo/db/<module>`).

## Commands

- `bun test`: every test in the repo, against in-memory SQLite.
- `bun run check`: lint (Ultracite, which is Biome) and typecheck.
- `bun run fix`: format and apply safe lint fixes.
- `bun run build`: production build.
- `bun run deploy`: build and deploy with wrangler. Needs a Cloudflare login and a real D1 database id in `apps/web/wrangler.jsonc`.
- `bun run db:apply` / `bun run db:apply:remote`: apply the D1 migrations to the local or the deployed database.
- `bun run db:seed` / `bun run db:seed:remote`: load the demo data into the local or the deployed database.

## Stack

Cloudflare Workers and D1, Hono, TanStack Start and Router, tRPC, Drizzle ORM, zod, shadcn/ui with Tailwind CSS v4, Bun, Turborepo, Ultracite.
