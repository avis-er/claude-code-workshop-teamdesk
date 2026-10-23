import { ROOM_CAPACITY_MAX, ROOM_NAME_MAX_LENGTH } from "@repo/db/shared";
import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback } from "react";
import FormError from "#/components/form-error";
import MemberNotice from "#/components/member-notice";
import PageError from "#/components/page-error";
import RoomList from "#/components/room-list";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useAction } from "#/hooks/use-action";
import { useCurrentMember } from "#/hooks/use-current-member";
import { getTrpc } from "#/integrations/trpc/client";

export const Route = createFileRoute("/rooms")({
  loader: async () => {
    const trpc = getTrpc();
    const rooms = await trpc.rooms.list.query();
    return { rooms };
  },
  component: RoomsPage,
  errorComponent: PageError,
});

function RoomsPage() {
  const { rooms } = Route.useLoaderData();
  const { canMutate, unknownMember, memberLookupFailed, retryMemberLookup } =
    useCurrentMember();
  const addRoom = useAction();
  const archiveRoom = useAction();

  const handleAdd = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const ok = await addRoom.run(() =>
        getTrpc().rooms.add.mutate({
          room: {
            capacity: Number(data.get("capacity")),
            name: String(data.get("name") ?? ""),
          },
        })
      );
      if (ok) {
        form.reset();
      }
    },
    [addRoom.run]
  );

  const handleArchive = useCallback(
    (roomId: string) =>
      archiveRoom.run(() => getTrpc().rooms.archive.mutate({ roomId })),
    [archiveRoom.run]
  );

  return (
    <main className="page-wrap px-4 py-12">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="island-kicker m-0">Teamdesk</p>
        <h1 className="display-title m-0 text-4xl text-foreground sm:text-5xl">
          Rooms
        </h1>
        <p className="m-0 text-base text-muted-foreground leading-8">
          The rooms the team can book. Only admins can add or archive them.
        </p>
      </section>

      {unknownMember || memberLookupFailed ? (
        <MemberNotice failed={memberLookupFailed} onRetry={retryMemberLookup} />
      ) : null}
      {canMutate ? (
        <form className="island-shell mt-10 p-6 sm:p-8" onSubmit={handleAdd}>
          <p className="island-kicker mb-3">Add room</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Room name"
              maxLength={ROOM_NAME_MAX_LENGTH}
              name="name"
              placeholder="Room name"
              required
            />
            <Input
              aria-label="Capacity"
              max={ROOM_CAPACITY_MAX}
              min={1}
              name="capacity"
              placeholder="Capacity"
              required
              type="number"
            />
            <Button disabled={addRoom.pending} type="submit">
              {addRoom.pending ? "Adding…" : "Add room"}
            </Button>
          </div>
          <FormError message={addRoom.error} />
        </form>
      ) : null}

      <section className="mt-10">
        <FormError message={archiveRoom.error} />
        <RoomList
          disabled={!canMutate || archiveRoom.pending}
          onArchive={handleArchive}
          rooms={rooms}
        />
      </section>
    </main>
  );
}
