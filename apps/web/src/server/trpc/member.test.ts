import { describe, expect, test } from "bun:test";
import type { Member } from "@repo/db/shared";
import { resolveMember } from "./member.ts";

const member: Member = {
  email: "ana@example.com",
  id: "1",
  joinedAt: "2026-01-01T00:00:00.000Z",
  name: "Ana",
  role: "admin",
};

describe("resolveMember", () => {
  test("rejects a signed-out caller", async () => {
    await expect(
      resolveMember(
        null,
        async () => null,
        async () => null
      )
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("rejects a signed-in caller without a matching verified email", async () => {
    await expect(
      resolveMember(
        "user_1",
        async () => "other@example.com",
        async () => null
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      resolveMember(
        "user_1",
        async () => null,
        async () => member
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("returns the member for a verified email", async () => {
    expect(
      await resolveMember(
        "user_1",
        async () => member.email,
        async () => member
      )
    ).toEqual(member);
  });
});
