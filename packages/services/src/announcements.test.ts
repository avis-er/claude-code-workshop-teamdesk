import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import {
  type AnnouncementsService,
  createAnnouncementsService,
} from "./announcements.ts";
import { at, createTeam, type Team } from "./fixtures.ts";

let team: Team;
let announcements: AnnouncementsService;

beforeEach(async () => {
  setSystemTime(new Date(at("10:00")));
  team = await createTeam();
  announcements = createAnnouncementsService(team.db);
});

afterEach(() => setSystemTime());

describe("announcements service", () => {
  test("only admins post", async () => {
    await expect(
      announcements.post(team.ana.id, { body: "Hi" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(
      (await announcements.post(team.admin.id, { body: " Hi " })).body
    ).toBe("Hi");
  });

  test("pinned announcements come first", async () => {
    const first = await announcements.post(team.admin.id, {
      body: "First",
      expiresAt: at("11:00"),
    });
    await announcements.post(team.admin.id, { body: "Second" });
    const expired = await announcements.post(team.admin.id, {
      body: "Expired",
      expiresAt: at("10:30"),
    });
    await announcements.pin(team.admin.id, first.id, true);
    await announcements.pin(team.admin.id, expired.id, true);

    setSystemTime(new Date(at("10:30")));

    expect((await announcements.latest()).map((a) => a.body)).toEqual([
      "First",
      "Second",
    ]);
  });

  test("lists future expiry until it passes and keeps announcements without expiry", async () => {
    const expiring = await announcements.post(team.admin.id, {
      body: "Temporary",
      expiresAt: at("11:00"),
    });
    const permanent = await announcements.post(team.admin.id, {
      body: "Permanent",
    });

    expect(expiring.expiresAt).toBe(at("11:00"));
    expect(permanent.expiresAt).toBeNull();
    expect((await announcements.latest()).map((a) => a.body)).toEqual([
      "Permanent",
      "Temporary",
    ]);

    setSystemTime(new Date(at("11:00")));
    expect((await announcements.latest()).map((a) => a.body)).toEqual([
      "Permanent",
    ]);
  });

  test.each([at("09:00"), at("10:00")])(
    "rejects an expiry at or before now (%s)",
    async (expiresAt) => {
      await expect(
        announcements.post(team.admin.id, { body: "Too late", expiresAt })
      ).rejects.toThrow("Expiry must be in the future.");
    }
  );

  test("normalizes offset expiry to UTC before storing it", async () => {
    const announcement = await announcements.post(team.admin.id, {
      body: "Offset",
      expiresAt: "2026-10-23T22:00:00+11:00",
    });

    expect(announcement.expiresAt).toBe(at("11:00"));
    expect((await announcements.latest()).map((a) => a.id)).toContain(
      announcement.id
    );
  });
});
