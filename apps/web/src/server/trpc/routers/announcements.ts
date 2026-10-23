import { postAnnouncementInput } from "@repo/services/announcements";
import { z } from "zod";
import { memberProcedure, publicProcedure, router } from "../init.ts";

export const announcementsRouter = router({
  latest: publicProcedure.query(({ ctx }) =>
    ctx.services.announcements.latest()
  ),
  pin: memberProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.services.announcements.pin(ctx.member.id, input.id, input.pinned)
    ),
  post: memberProcedure
    .input(z.object({ announcement: postAnnouncementInput }))
    .mutation(({ ctx, input }) =>
      ctx.services.announcements.post(ctx.member.id, input.announcement)
    ),
});
