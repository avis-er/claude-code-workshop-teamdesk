import type { Database } from "@repo/db";
import {
  insertAnnouncement,
  listAnnouncements,
  setAnnouncementPinned,
} from "@repo/db/announcements";
import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  type Announcement,
} from "@repo/db/shared";
import { z } from "zod";
import { NotFoundError, ValidationError } from "./errors.ts";
import { requireAdmin } from "./members.ts";
import { toUtcIso } from "./time.ts";

const LATEST_LIMIT = 10;

export const postAnnouncementInput = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Announcement must not be empty.")
    .max(
      ANNOUNCEMENT_BODY_MAX_LENGTH,
      `Announcement must be at most ${ANNOUNCEMENT_BODY_MAX_LENGTH} characters.`
    ),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  pinned: z.boolean().default(false),
});

export type PostAnnouncementInput = z.input<typeof postAnnouncementInput>;

export interface AnnouncementsService {
  /** Pinned first, then the latest few. */
  latest: () => Promise<Announcement[]>;
  /** Admins only. */
  pin: (actorId: string, id: string, pinned: boolean) => Promise<Announcement>;
  /** Admins only. */
  post: (
    actorId: string,
    input: PostAnnouncementInput
  ) => Promise<Announcement>;
}

export const createAnnouncementsService = (
  db: Database
): AnnouncementsService => ({
  latest: () => listAnnouncements(db, LATEST_LIMIT, new Date().toISOString()),
  pin: async (actorId, id, pinned) => {
    await requireAdmin(db, actorId);
    const announcement = await setAnnouncementPinned(db, id, pinned);
    if (!announcement) {
      throw new NotFoundError("Announcement", id);
    }
    return announcement;
  },
  post: async (actorId, input) => {
    await requireAdmin(db, actorId);
    const data = postAnnouncementInput.parse(input);
    const expiresAt = data.expiresAt ? toUtcIso(data.expiresAt) : undefined;
    if (expiresAt && expiresAt <= new Date().toISOString()) {
      throw new ValidationError("Expiry must be in the future.");
    }
    return await insertAnnouncement(db, {
      ...data,
      authorId: actorId,
      expiresAt,
    });
  },
});
