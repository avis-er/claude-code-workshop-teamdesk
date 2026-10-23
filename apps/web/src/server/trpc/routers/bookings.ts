import {
  createBookingInput,
  rescheduleBookingInput,
} from "@repo/services/bookings";
import { z } from "zod";
import { memberProcedure, publicProcedure, router } from "../init.ts";

export const bookingsRouter = router({
  cancel: memberProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.services.bookings.cancel(ctx.member.id, input.bookingId)
    ),
  create: memberProcedure
    .input(z.object({ booking: createBookingInput }))
    .mutation(({ ctx, input }) =>
      ctx.services.bookings.create(ctx.member.id, input.booking)
    ),
  forRoom: publicProcedure
    .input(z.object({ day: z.iso.datetime(), roomId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.services.bookings.listForRoom(input.roomId, input.day)
    ),
  reschedule: memberProcedure
    .input(
      z.object({
        bookingId: z.string(),
        slot: rescheduleBookingInput,
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.services.bookings.reschedule(
        ctx.member.id,
        input.bookingId,
        input.slot
      )
    ),
  upcoming: publicProcedure
    .input(z.object({ memberId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.services.bookings.listUpcoming(
        input.memberId,
        new Date().toISOString()
      )
    ),
});
