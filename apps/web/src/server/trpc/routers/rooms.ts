import { addRoomInput } from "@repo/services/rooms";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { memberProcedure, publicProcedure, router } from "../init.ts";

export const roomsRouter = router({
  add: memberProcedure
    .input(z.object({ room: addRoomInput }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.rooms.add(ctx.member.id, input.room);
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      }
      return result.room;
    }),
  archive: memberProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.rooms.archive(
        ctx.member.id,
        input.roomId
      );
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      }
      return result.room;
    }),
  free: publicProcedure
    .input(
      z.object({
        attendees: z.int().min(1),
        endsAt: z.string(),
        startsAt: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.services.availability.freeRooms(input);
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      }
      return result.rooms;
    }),
  list: publicProcedure
    .input(z.object({ includeArchived: z.boolean().default(false) }).optional())
    .query(({ ctx, input }) => ctx.services.rooms.list(input)),
});
