import type { Member } from "@repo/db/shared";
import { TRPCError } from "@trpc/server";

export async function resolveMember(
  userId: string | null,
  getVerifiedEmail: (userId: string) => Promise<string | null>,
  findMemberByEmail: (email: string) => Promise<Member | null>
): Promise<Member> {
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const email = await getVerifiedEmail(userId);
  const member = email ? await findMemberByEmail(email) : null;
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your verified email is not a team member.",
    });
  }
  return member;
}
