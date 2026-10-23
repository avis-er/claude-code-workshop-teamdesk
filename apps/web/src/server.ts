import { trpcServer } from "@hono/trpc-server";
import handler from "@tanstack/react-start/server-entry";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { type Context, createHonoContext } from "./server/trpc/context.ts";
import { appRouter } from "./server/trpc/router.ts";

const app = new Hono<{
  Bindings: Env;
  Variables: { trpcContext: Context };
}>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

// tRPC: queries and mutations for the browser. During SSR the loaders call the
// same router in-process instead (src/integrations/trpc/client.ts).
// csrf() rejects cross-site POSTs with form content types, which browsers send
// without a preflight. JSON POSTs are safe only because a cross-site one needs
// a CORS preflight that nothing here answers: adding cors() to these routes
// would leave mutations open to CSRF.
app.use("/api/trpc/*", csrf());
app.use("/api/trpc/*", async (c, next) => {
  const context = await createHonoContext(c.env, c.req.raw, c.res.headers);
  const location = c.res.headers.get("Location");
  if (location) {
    return new Response(null, { headers: c.res.headers, status: 307 });
  }
  c.set("trpcContext", context);
  await next();
});
app.use(
  "/api/trpc/*",
  trpcServer({
    createContext: (_opts, c) => c.get("trpcContext"),
    endpoint: "/api/trpc",
    // Production clients only see "Internal server error" (see init.ts), so
    // the real error goes to the Worker logs.
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`tRPC ${path ?? "?"} failed:`, error.cause ?? error);
      }
    },
    router: appRouter,
  })
);

// Everything else is handled by TanStack Start (SSR pages and assets).
app.all("*", (c) => handler.fetch(c.req.raw));

export default app;
