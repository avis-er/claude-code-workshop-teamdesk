import { createTaskInput } from "@repo/services/tasks";
import { z } from "zod";
import { memberProcedure, publicProcedure, router } from "../init.ts";

/** Today's date in UTC, YYYY-MM-DD. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

export const tasksRouter = router({
  assign: memberProcedure
    .input(
      z.object({
        assigneeId: z.string().nullable(),
        taskId: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.services.tasks.assign(ctx.member.id, input.taskId, input.assigneeId)
    ),
  complete: memberProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.services.tasks.complete(ctx.member.id, input.taskId)
    ),
  create: memberProcedure
    .input(z.object({ task: createTaskInput }))
    .mutation(({ ctx, input }) =>
      ctx.services.tasks.create(ctx.member.id, input.task, todayUtc())
    ),
  list: publicProcedure
    .input(z.object({ assigneeId: z.string().optional() }).optional())
    .query(({ ctx, input }) => ctx.services.tasks.list(input)),
});
