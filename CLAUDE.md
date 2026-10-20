# Teamdesk Engineering Guide (CLAUDE.md)

This file is read by Claude Code at the start of every session. Please keep it up to date. If you change a convention, change it here too.

## Project overview

Teamdesk is a small internal tool for managing rooms, bookings, tasks, notes and announcements for a team. It is a Bun monorepo. The web app is built with TanStack Start and runs on Cloudflare Workers. Data lives in Cloudflare D1 and is accessed through Drizzle ORM. The API layer is tRPC, mounted on a Hono Worker.

The monorepo has three workspaces:

- `apps/web` is the TanStack Start application, including the Hono entry point and the tRPC routers.
- `packages/db` (`@repo/db`) holds the Drizzle schema, migrations and query functions.
- `packages/services` (`@repo/services`) holds business rules and validation on top of `@repo/db`.

### Request path

Every request should travel through the layers in this order, and no layer should skip another:

1. A route component in `apps/web`.
2. A tRPC router in `apps/web/src/server/trpc/routers/`.
3. A service from `@repo/services/<module>`.
4. Query functions from `@repo/db/<module>`.

### Commands

- `bun install` installs dependencies.
- `bun test` runs every test in the repo against in-memory SQLite.
- `bun run check` runs the linter (Ultracite, which wraps Biome) and the typechecker.
- `bun run fix` formats the code and applies safe lint fixes.
- `bun run dev` starts the app locally. It needs no Cloudflare login and no environment variables.
- `bun run build` creates a production build.
- `bun run generate` (inside `packages/db`) creates a new migration from the schema.
- Do not run `bun run deploy`. Deployments are handled by the release owner.

### Important facts

- The browser must only import `@repo/db/shared`. Any other `@repo/db` entry point pulls drizzle into the client bundle and will break the build or bloat it.
- After editing `packages/db/src/schema.ts`, run `bun run generate` in `packages/db` and commit the whole `migrations/` folder, including the `meta/` subfolder.
- `apps/web/src/components/ui/` contains shadcn/ui output. Do not edit these files by hand. Biome is configured to skip the folder.
- There is no sign-in at the moment. Mutations take an `actorId`, which the user picks in the UI with the member picker.
- Times are stored as UTC ISO strings. Booking slots are half open, `[startsAt, endsAt)`.
- Services receive `now` or `today` as arguments. They should not read the clock themselves, so that tests stay deterministic.

### Error handling

- Services fail by throwing a subclass of `ServiceError` from `packages/services/src/errors.ts`. Use `NotFoundError`, `ValidationError`, `ConflictError` or `ForbiddenError`.
- The tRPC middleware maps the error code onto an HTTP status. Do not map codes in routers.
- Never throw plain `Error` from a service. Never throw strings.

## TypeScript style guide

This section was copied from our shared engineering handbook so that everyone follows the same rules.

### Naming

- Use `camelCase` for variables, functions and methods.
- Use `PascalCase` for classes, interfaces, type aliases, enums and React components.
- Use `UPPER_SNAKE_CASE` for true constants that are never reassigned and are module level.
- Use `camelCase` for object keys unless an external API requires otherwise.
- Do not prefix interfaces with `I` and do not prefix type parameters with `T` unless the parameter is a single letter.
- Name booleans with a prefix such as `is`, `has`, `can` or `should`.
- Name functions with verbs, and name values with nouns.
- Avoid abbreviations unless they are universally understood (`id`, `url`, `html`).
- File names are kebab-case, for example `booking-service.ts` and `room-card.tsx`.
- Test files sit next to the code and end in `.test.ts`.

### Types and interfaces

- Prefer `interface` for object shapes that may be extended, and `type` for unions, intersections and mapped types.
- Prefer type inference for local variables. Add explicit types to exported function signatures.
- Do not use `any`. Use `unknown` and narrow it.
- Do not use the non-null assertion operator `!` unless you can show it is safe.
- Prefer `readonly` for properties and arrays that should not change.
- Use `as const` for literal objects that act as enums.
- Prefer generics over type assertions.
- Use `satisfies` to check a value against a type without widening it.
- Export types from the module that owns them. Do not redefine the same type in two places.
- Use zod schemas as the source of truth for input types, and infer types with `z.infer`.

### Enums

- Do not use TypeScript `enum`. Use string literal unions or `as const` objects instead.
- If you need a runtime list of values, define the array first with `as const` and derive the union type from it.

### Null handling

- Prefer `undefined` over `null` for optional values inside TypeScript code.
- Use `null` only when the value comes from the database or an external API that uses it.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of manual checks.
- Do not use `||` for defaults when `0`, `""` or `false` are valid values.
- Check for `null` and `undefined` together with `== null` only if the linter allows it. Otherwise check both.
- Return early when a value is missing instead of nesting.

### Imports

- Order imports in four groups, separated by a blank line: built-ins, external packages, workspace packages (`@repo/*`), then relative imports.
- Sort alphabetically within each group.
- Use `import type` for imports that are only used as types.
- Do not use default exports except where a framework requires them (for example route files).
- Prefer named imports over namespace imports.
- Do not import from another package's `src` folder. Use the package entry points.

### Comments and documentation

- Write code that explains itself. Comment on why, not on what.
- Use `//` for short comments and `/** */` for exported functions that need documentation.
- Write `TODO` comments with an owner and a ticket number.
- Use full sentences with correct punctuation in comments.

### Async code

- Prefer `async` and `await` over raw promise chains.
- Always `await` a promise or return it. Do not leave floating promises.
- Use `Promise.all` when independent operations can run in parallel.
- Use `Promise.allSettled` when you need every result even if some fail.
- Do not use `async` on a function that never awaits.
- Do not mix callbacks and promises in the same function.
- Handle rejections. Every `await` that can fail should be inside a `try` block or have a caller that handles it.

### Functions

- Keep functions short, ideally under 40 lines.
- A function should do one thing.
- Prefer pure functions. Isolate side effects at the edges.
- Limit parameters to three. Use an options object beyond that.
- Prefer arrow functions for callbacks and `function` declarations for top level named functions.
- Use early returns to reduce nesting.

### Errors

- Throw `Error` objects or subclasses, never strings or plain objects.
- Do not swallow errors with an empty `catch`.
- Include enough context in the message to find the cause.
- Do not log and rethrow in the same place.
- Use custom error classes for errors that callers need to tell apart.

## React guidelines

### Components

- Use function components only. Do not write class components.
- One component per file for anything larger than a few lines.
- React component files use PascalCase names, for example `RoomCard.tsx` and `BookingForm.tsx`, so the file name matches the exported component.
- Keep components small. If a component has more than about 150 lines, split it.
- Separate presentational components from components that fetch data.
- Define prop types with a `type` or `interface` named `<Component>Props`.
- Destructure props in the function signature.
- Do not pass entire objects as props when two fields will do.
- Avoid prop drilling beyond two levels. Use composition or context.
- Prefer composition over inheritance and over configuration props.

### Hooks

- Follow the rules of hooks. Call hooks at the top level and only from components or other hooks.
- Name custom hooks with a `use` prefix.
- Keep `useEffect` for synchronising with external systems. Do not use it to derive state.
- Always list every dependency in the dependency array. Do not silence the lint rule.
- Clean up subscriptions, timers and listeners in the effect cleanup function.
- Prefer `useReducer` when state transitions are complex.
- Do not store derived values in state. Compute them during render.
- Extract repeated hook logic into a custom hook.

### Memoisation

- Do not memoise by default. Measure first.
- Use `useMemo` for expensive calculations and for stable references passed to memoised children.
- Use `useCallback` for functions passed to memoised children or used in dependency arrays.
- Use `React.memo` only for components that re-render often with the same props.
- Never rely on memoisation for correctness.

### State

- Keep state as local as possible.
- Lift state up only when siblings need it.
- Use TanStack Query (through tRPC) for server state. Do not copy server data into local state.
- Use controlled inputs for forms, or a form library for large forms.
- Do not mutate state. Create new objects and arrays.

### Rendering

- Always give list items a stable `key`. Do not use the array index if the list can change.
- Do not render raw HTML from user input. Avoid `dangerouslySetInnerHTML`.

### Accessibility

- Use semantic HTML elements (`button`, `nav`, `main`, `label`).
- Every form control needs a label.
- Every image needs `alt` text, or an empty `alt` if it is decorative.
- Make sure all interactive elements can be reached and used with a keyboard.
- Do not use `div` or `span` with click handlers in place of buttons.
- Keep colour contrast at WCAG AA or better.
- Use `aria-*` attributes only when native semantics are not enough.
- Manage focus when opening and closing dialogs. The shadcn/ui primitives already do this.

## Database

- Always use the drizzle query builder (`select`, `insert`, `update`, `delete`) for queries. It keeps queries typed and consistent.
- Query functions live in `packages/db/src/<table>.ts`, one file per table.
- Services must never query tables directly. They must not import tables from `@repo/db` or operators from `drizzle-orm`.
- Return the plain JSON shapes defined in `@repo/db/shared`.
- Limits defined in `@repo/db/shared` are inclusive maxima. A limit of 3 allows 3.
- Keep migrations small. One logical change per migration.
- Never edit a migration after it has been committed to `main`.
- Test queries against in-memory SQLite using the helpers in `packages/db/src/testing.ts`.
- Use `returning()` instead of a second select after an insert or update.
- Use batches for related writes, because D1 does not support long running transactions.

## Services

- A service is a factory that takes a drizzle instance, for example `createNotesService(db)`.
- Export the zod input schema. The tRPC router passes it to `.input()`, and the service parses with it again.
- Methods are `async`.
- Never read `env`, bindings or the request inside a service.
- A mutation takes `actorId` first. Load the actor with `requireMember` or `requireAdmin` from `members.ts`.
- Check ownership (owner or admin) on every method that changes a record.
- A new service also needs a line in `apps/web/src/server/trpc/context.ts`.
- Inside a `try` block, use `return await` so that the `catch` can see rejections.

## Architecture principles

These are the principles behind the layout above. When in doubt, go back to them.

### SOLID

- Single responsibility: a module, class or function should have one reason to change. A router parses input and calls a service. A service applies rules. A query function talks to the database.
- Open/closed: extend behaviour by adding code, not by editing working code. Prefer adding a new strategy or handler over adding another `if` branch.
- Liskov substitution: any implementation of an interface must be usable wherever the interface is expected, with no surprises.
- Interface segregation: keep interfaces small and focused. Do not force a caller to depend on methods it does not use.
- Dependency inversion: high level code should depend on abstractions. Pass dependencies in (the drizzle instance, the clock) rather than creating them inside.

### DRY

- Do not repeat knowledge. If a rule exists in two places, they will drift apart.
- Extract shared logic only after it appears three times. Two similar pieces of code are not always duplication.
- Prefer a small shared helper over copying and pasting.
- Duplicated tests are fine when they make each test easier to read.

### Clean architecture

- Dependencies point inward. Business rules must not depend on frameworks, the database or the UI.
- `@repo/services` knows nothing about tRPC, Hono or Cloudflare. A script or a test should be able to use a service directly.
- Keep framework code at the edges (routes, routers, Worker entry).
- Keep routers thin. A router is an input schema plus one service call. Put logic in the service.
- Keep domain types free of framework imports.
- Make invalid states hard to represent.

### Other principles

- Prefer composition over inheritance.
- Fail fast and loudly.
- Delete code you do not need.
- Write the test first when fixing a bug.

## Performance notes

- Prefer raw SQL with the `sql` template for anything non-trivial, such as joins across three tables or aggregations. It is faster than the query builder and easier to read.
- Always use parameters through the `sql` template. Never build SQL by joining strings.
- Add an index when a query filters on a column that is not the primary key, and the table is expected to grow.
- Use the D1 batch API to cut round trips.
- Cache read only data at the Worker level only when you can show it helps.

## Authorisation

- No sign-in exists yet, so the actor is passed as `actorId` with every mutation.
- Validate permissions in the router before calling the service. A router should check that the actor is allowed to perform the action and return `FORBIDDEN` early if not.
- Admin only actions use `requireAdmin`. Member actions use `requireMember`.
- Never trust an `actorId` sent from the client once real sign-in exists. It will be replaced by the session user.

## Service result convention

- All service methods must return a Result object `{ ok, error }` and never throw. Callers check `ok` before using the value.
- Do not let exceptions escape a service. Catch them inside the service and convert them to `{ ok: false, error }`.
- Routers translate the `error` field into an HTTP status.

## Git workflow

- `main` is always deployable. Do not push to it directly.
- Create a branch from `main` for each piece of work. Name it `<type>/<short-description>`, for example `feat/room-capacity` or `fix/booking-overlap`.
- Valid types are `feat`, `fix`, `chore`, `docs`, `refactor` and `test`.
- Keep branches short lived. Rebase on `main` at least once a day.
- Write commit messages in the imperative mood, for example "Add room capacity field".
- Use Conventional Commits for the subject line: `feat(rooms): add capacity field`.
- Keep the subject under 72 characters. Put detail in the body.
- Make small commits that each leave the tests passing.
- Do not commit generated files except `migrations/`.
- Do not commit secrets, `.env` files or local databases.
- Squash merge pull requests. The squash title becomes the commit on `main`.
- Delete the branch after it is merged.
- Never force push to a shared branch.
- Do not rewrite history on `main`.

## PR checklist

Before asking for review, check each of these:

- [ ] The pull request has a clear title and a short description of what and why.
- [ ] `bun run check` passes.
- [ ] `bun test` passes.
- [ ] New behaviour has tests, and bug fixes have a test that failed before the fix.
- [ ] Schema changes include a generated migration, including `meta/`.
- [ ] No `console.log` or debugging code is left in.
- [ ] No commented out code is left in.
- [ ] No new `any` types or lint suppressions were added without a reason.
- [ ] Public functions have clear names and types.
- [ ] The UI works on a narrow screen and with the keyboard.
- [ ] The README or this file is updated if a convention changed.
- [ ] Screenshots are attached for visible changes.
- [ ] The pull request is small enough to review in 30 minutes. Split it if not.

## Testing

- Tests use `bun test` and run against in-memory SQLite.
- Put a test file next to the module it tests.
- Use the fixtures in `packages/services/src/fixtures.ts` for members and rooms.
- Test behaviour, not implementation.
- Do not mock the database. Use the in-memory instance.

## File and folder conventions

- Use kebab-case for all file and folder names, with no exceptions.
- Keep one module per file in `packages/db/src` and `packages/services/src`, named after the table or domain.
- Do not create `index.ts` barrel files in packages. Each module has its own entry point.
- Put shared UI in `apps/web/src/components`, grouped by feature.
- Keep route files thin. Move logic into components and hooks.

## Legacy areas

- `rooms.ts` and `availability.ts` in `packages/services/src` return `{ ok: false, error }`. Everything else throws. Do not copy the pattern.
- `packages/db/src/rooms.ts` uses raw `sql`. New queries should use the query builder.
- `apps/web/src/components/bookings/` has PascalCase file names. We plan to rename them later.
- Some older tests build their own data instead of using the fixtures.

## Changelog

This section records notable changes to the app and to this file. Add new entries at the bottom. Please keep them short.

### 2025

- 2025-11-03: Project created from cf-tanstack-boilerplate.
- 2025-11-04: Added Bun workspaces for `apps/web`, `packages/db` and `packages/services`.
- 2025-11-06: Added Drizzle schema for members and notes.
- 2025-11-07: Added first migration and local seed data.
- 2025-11-10: Added notes service and tRPC router.
- 2025-11-12: Added Clerk for sign-in.
- 2025-11-14: Added rule about running `bun run check` before commit.
- 2025-11-17: Added TypeScript style guide section to this file.
- 2025-11-19: Added members service with `requireMember` and `requireAdmin`.
- 2025-11-21: Added rooms table and rooms router.
- 2025-11-24: Added React guidelines section to this file.
- 2025-12-01: Added bookings table and first version of the bookings service.
- 2025-12-03: Added rule about half open booking slots.
- 2025-12-05: Added availability service.
- 2025-12-08: Added Git workflow section to this file.
- 2025-12-10: Added PR checklist section to this file.
- 2025-12-12: Rooms service switched to returning Result objects.
- 2025-12-17: Added rule about kebab-case file names.
- 2025-12-19: Added tasks table and tasks service.
- 2025-12-22: Added Architecture principles section to this file.

### 2026

- 2026-01-05: Added announcements table and service.
- 2026-01-12: Added rule about never editing `components/ui/`.
- 2026-01-14: Added rule about services never reading `env`.
- 2026-01-16: Added rule about passing `now` and `today` into services.
- 2026-01-20: Bookings service moved to throwing ServiceError subclasses.
- 2026-01-22: Added the errors module with `NotFoundError`, `ValidationError` and `ConflictError`.
- 2026-01-26: Added `ForbiddenError`.
- 2026-01-28: Added rule that services throw typed errors.
- 2026-02-02: Added the Database section to this file.
- 2026-02-04: Migrated rooms to drizzle (partial). Search still uses raw SQL.
- 2026-02-06: Added rule about using the query builder everywhere.
- 2026-02-09: Added member picker to the UI.
- 2026-02-11: Removed Clerk. Sign-in is postponed, mutations take `actorId`.
- 2026-02-13: Removed the Clerk section from this file.
- 2026-02-17: Added rule about `return await` inside `try`.
- 2026-02-19: Added rule about inclusive limits in `@repo/db/shared`.
- 2026-02-23: Added Performance notes section to this file.
- 2026-02-25: Added rule about preferring raw SQL for non-trivial queries.
- 2026-03-02: Added Authorisation section to this file.
- 2026-03-04: Added rule about checking permissions in routers.
- 2026-03-09: Added rule about keeping routers thin.
- 2026-03-16: Added Testing section to this file.
- 2026-03-18: Added fixtures module for services tests.
- 2026-03-23: Added the Legacy areas section.
- 2026-03-25: Added rule about PascalCase for React component files.
- 2026-03-27: Added rule about rooms search using raw SQL.
- 2026-03-30: Renamed some booking components to PascalCase.
- 2026-04-06: Added Service result convention section to this file.
- 2026-04-08: Added `@repo/db/shared` as the only browser safe entry point.
- 2026-04-13: Added rule about browser code importing only `@repo/db/shared`.
- 2026-04-20: Added announcements page.
- 2026-05-04: Added rule about migrations including `meta/`.
- 2026-05-06: Added `bun run generate` instructions to this file.
- 2026-05-20: Added rule about not deploying from a laptop.
- 2026-06-03: Fixed local dev so it needs no Cloudflare login.
- 2026-06-10: Added room capacity field.
- 2026-06-15: Added rule about deleting commented out code.
- 2026-06-24: Added rule about the PR size limit.
- 2026-07-06: Added rule about squash merges.
- 2026-07-27: Added rule about screenshots in pull requests.
- 2026-08-03: Added accessibility rules to the React guidelines.
- 2026-08-17: Added rule about not mocking the database.
- 2026-08-24: Added member roles to the members table.
- 2026-09-01: Added rule about Promise.all for independent work.
- 2026-08-31: Added rule about Promise.allSettled.
- 2026-09-07: Cleaned up this file. Merged duplicate rules. Some may have crept back.
- 2026-09-14: Added Legacy areas details about older tests.
- 2026-09-28: Added rule about avoiding select star.
- 2026-10-05: Updated the Project overview section.
- 2026-10-12: Added rule about caching at the Worker level.
- 2026-10-14: Added bookings page filters for room and day.
- 2026-10-19: Reviewed this file. Left as is for now.
