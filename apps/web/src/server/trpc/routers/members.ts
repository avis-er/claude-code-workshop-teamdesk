import { MEMBER_ROLES } from "@repo/db/shared";
import { addMemberInput } from "@repo/services/members";
import { z } from "zod";
import { memberProcedure, publicProcedure, router } from "../init.ts";

export const membersRouter = router({
  add: memberProcedure
    .input(z.object({ member: addMemberInput }))
    .mutation(({ ctx, input }) =>
      ctx.services.members.add(ctx.member.id, input.member)
    ),
  current: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }
    const email = await ctx.getVerifiedEmail(ctx.userId);
    return email ? ctx.findMemberByEmail(email) : null;
  }),
  list: publicProcedure.query(({ ctx }) => ctx.services.members.list()),
  setRole: memberProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(MEMBER_ROLES),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.services.members.setRole(ctx.member.id, input.memberId, input.role)
    ),
});
