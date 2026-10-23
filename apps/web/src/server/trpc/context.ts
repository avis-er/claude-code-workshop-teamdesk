import { env } from "cloudflare:workers";
import { createClerkClient } from "@clerk/backend";
import type { Database } from "@repo/db";
import { getMemberByEmail } from "@repo/db/members";
import { createAnnouncementsService } from "@repo/services/announcements";
import { createAvailabilityService } from "@repo/services/availability";
import { createBookingsService } from "@repo/services/bookings";
import { createMembersService } from "@repo/services/members";
import { createNotesService } from "@repo/services/notes";
import { createRoomsService } from "@repo/services/rooms";
import { createTasksService } from "@repo/services/tasks";
import { getRequest } from "@tanstack/react-start/server";
import { drizzle } from "drizzle-orm/d1";

const createServices = (db: Database) => ({
  announcements: createAnnouncementsService(db),
  availability: createAvailabilityService(db),
  bookings: createBookingsService(db),
  members: createMembersService(db),
  notes: createNotesService(db),
  rooms: createRoomsService(db),
  tasks: createTasksService(db),
});

// biome-ignore lint/style/useConsistentTypeDefinitions: @hono/trpc-server requires a Record
export type Context = {
  services: ReturnType<typeof createServices>;
  userId: string | null;
  getVerifiedEmail: (userId: string) => Promise<string | null>;
  findMemberByEmail: (email: string) => ReturnType<typeof getMemberByEmail>;
};

async function createContext(
  bindings: Env,
  request: Request,
  onAuthHeaders?: (headers: Headers) => void
): Promise<Context> {
  const client = createClerkClient({
    publishableKey: bindings.CLERK_PUBLISHABLE_KEY,
    secretKey: bindings.CLERK_SECRET_KEY,
  });
  const state = await client.authenticateRequest(request, {
    acceptsToken: "session_token",
    authorizedParties: [new URL(request.url).origin],
  });
  onAuthHeaders?.(state.headers);
  const db = drizzle(bindings.DB);
  return {
    findMemberByEmail: (email) => getMemberByEmail(db, email),
    getVerifiedEmail: async (userId) => {
      const user = await client.users.getUser(userId);
      const primary = user.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId
      );
      return primary?.verification?.status === "verified"
        ? primary.emailAddress
        : null;
    },
    services: createServices(db),
    userId: state.isAuthenticated ? state.toAuth().userId : null,
  };
}

export const createHonoContext = (
  bindings: Env,
  request: Request,
  responseHeaders: Headers
) =>
  createContext(bindings, request, (headers) => {
    // Hono merges responseHeaders into the tRPC response. Keep each refreshed
    // Clerk session cookie separate so the browser receives all of them.
    for (const cookie of headers.getSetCookie()) {
      responseHeaders.append("Set-Cookie", cookie);
    }
    headers.forEach((value, key) => {
      if (key !== "set-cookie") {
        responseHeaders.append(key, value);
      }
    });
  });

export const createSsrContext = () => createContext(env, getRequest());
