import { createNoteInput } from "@repo/services/notes";
import { memberProcedure, publicProcedure, router } from "../init.ts";

// Thin on purpose: input validation and business rules live in
// @repo/services, so the router only maps calls onto the service.
export const notesRouter = router({
  create: memberProcedure
    .input(createNoteInput)
    .mutation(({ ctx, input }) => ctx.services.notes.create(input)),
  list: publicProcedure.query(({ ctx }) => ctx.services.notes.list()),
});
