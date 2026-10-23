import type { Booking } from "@repo/db/shared";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import BookingForm, {
  type BookingDraft,
} from "#/components/bookings/BookingForm";
import BookingList from "#/components/bookings/BookingList";
import FormError from "#/components/form-error";
import MemberNotice from "#/components/member-notice";
import PageError from "#/components/page-error";
import { Input } from "#/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "#/components/ui/native-select";
import { useAction } from "#/hooks/use-action";
import { useCurrentMember } from "#/hooks/use-current-member";
import { getTrpc } from "#/integrations/trpc/client";
import { todayUtc } from "#/lib/datetime";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface BookingsSearch {
  day?: string;
  roomId?: string;
}

export const Route = createFileRoute("/bookings")({
  // The router parses search values as JSON, so `?roomId=1` arrives as a number.
  validateSearch: (search: Record<string, unknown>): BookingsSearch => ({
    day:
      typeof search.day === "string" && DAY_PATTERN.test(search.day)
        ? search.day
        : undefined,
    roomId:
      typeof search.roomId === "string" || typeof search.roomId === "number"
        ? String(search.roomId)
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const trpc = getTrpc();
    const [members, rooms] = await Promise.all([
      trpc.members.list.query(),
      trpc.rooms.list.query(),
    ]);
    const day = deps.day ?? todayUtc();
    const room = rooms.find((r) => r.id === deps.roomId) ?? rooms[0] ?? null;
    const bookings = room
      ? await trpc.bookings.forRoom.query({
          day: `${day}T00:00:00.000Z`,
          roomId: room.id,
        })
      : [];
    return { bookings, day, members, room, rooms };
  },
  component: BookingsPage,
  errorComponent: PageError,
});

function BookingsPage() {
  const { bookings, day, members, room, rooms } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const {
    member: currentMember,
    canMutate,
    unknownMember,
    memberLookupFailed,
    retryMemberLookup,
  } = useCurrentMember();
  const createBooking = useAction();
  const cancelBooking = useAction();
  const memberId = currentMember?.id;
  const [upcoming, setUpcoming] = useState<Booking[]>([]);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );
  const roomNames = useMemo(
    () => new Map(rooms.map((r) => [r.id, r.name])),
    [rooms]
  );

  const loadUpcoming = useCallback(async () => {
    if (!memberId) {
      setUpcoming([]);
      return;
    }
    setUpcoming(await getTrpc().bookings.upcoming.query({ memberId }));
  }, [memberId]);

  useEffect(() => {
    loadUpcoming().catch(() => setUpcoming([]));
  }, [loadUpcoming]);

  const handleRoomChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      navigate({ search: { day, roomId: event.target.value } }),
    [day, navigate]
  );

  const handleDayChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.value) {
        navigate({ search: { day: event.target.value, roomId: room?.id } });
      }
    },
    [navigate, room?.id]
  );

  const handleCreate = useCallback(
    async (draft: BookingDraft) => {
      if (!room) {
        return false;
      }
      const ok = await createBooking.run(() =>
        getTrpc().bookings.create.mutate({
          booking: { ...draft, roomId: room.id },
        })
      );
      if (ok) {
        await loadUpcoming();
      }
      return ok;
    },
    [createBooking.run, loadUpcoming, room]
  );

  const handleCancel = useCallback(
    async (bookingId: string) => {
      const ok = await cancelBooking.run(() =>
        getTrpc().bookings.cancel.mutate({ bookingId })
      );
      if (ok) {
        await loadUpcoming();
      }
    },
    [cancelBooking.run, loadUpcoming]
  );

  const describeForRoom = useCallback(
    (booking: Booking) =>
      `booked by ${memberNames.get(booking.memberId) ?? "unknown member"}`,
    [memberNames]
  );

  const describeUpcoming = useCallback(
    (booking: Booking) =>
      `${roomNames.get(booking.roomId) ?? "archived room"} on ${booking.startsAt.slice(0, 10)}`,
    [roomNames]
  );

  return (
    <main className="page-wrap px-4 py-12">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="island-kicker m-0">Teamdesk</p>
        <h1 className="display-title m-0 text-4xl text-foreground sm:text-5xl">
          Bookings
        </h1>
        <p className="m-0 text-base text-muted-foreground leading-8">
          Pick a room and a day to see who has it, then book a slot. All times
          are UTC.
        </p>
      </section>

      {unknownMember || memberLookupFailed ? (
        <MemberNotice failed={memberLookupFailed} onRetry={retryMemberLookup} />
      ) : null}
      {room ? (
        <>
          <section className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <NativeSelect
              aria-label="Room"
              onChange={handleRoomChange}
              value={room.id}
            >
              {rooms.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {r.name} (seats {r.capacity})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              aria-label="Day"
              className="sm:w-44"
              onChange={handleDayChange}
              type="date"
              value={day}
            />
          </section>

          {canMutate ? (
            <div className="mt-6">
              <BookingForm
                capacity={room.capacity}
                day={day}
                error={createBooking.error}
                onSubmit={handleCreate}
                pending={createBooking.pending}
              />
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="mb-4 font-heading text-2xl text-foreground">
              {room.name} on {day}
            </h2>
            <FormError message={cancelBooking.error} />
            <BookingList
              bookings={bookings}
              describe={describeForRoom}
              disabled={!canMutate || cancelBooking.pending}
              emptyText="Nothing booked yet."
              onCancel={handleCancel}
            />
          </section>
        </>
      ) : (
        <p className="mt-10 text-muted-foreground text-sm">
          There are no rooms yet. Add one on the Rooms page.
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-heading text-2xl text-foreground">
          My upcoming bookings
        </h2>
        <BookingList
          bookings={upcoming}
          describe={describeUpcoming}
          disabled={!canMutate || cancelBooking.pending}
          emptyText="You have no upcoming bookings."
          onCancel={handleCancel}
        />
      </section>
    </main>
  );
}
