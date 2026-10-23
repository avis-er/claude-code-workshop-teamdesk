import { useAuth } from "@clerk/tanstack-react-start";
import type { Member } from "@repo/db/shared";
import { useCallback, useEffect, useState } from "react";
import { getTrpc } from "#/integrations/trpc/client";

export function useCurrentMember() {
  const { isLoaded, userId } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    userId: string | null;
    member: Member | null;
    loaded: boolean;
    failed: boolean;
  }>({ failed: false, loaded: false, member: null, userId: null });

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt triggers an explicit retry
  useEffect(() => {
    if (!userId) {
      setState({ failed: false, loaded: false, member: null, userId: null });
      return;
    }
    let active = true;
    setState({ failed: false, loaded: false, member: null, userId });
    getTrpc()
      .members.current.query()
      .then(
        (currentMember) => {
          if (active) {
            setState({
              failed: false,
              loaded: true,
              member: currentMember,
              userId,
            });
          }
        },
        () => {
          if (active) {
            setState({ failed: true, loaded: true, member: null, userId });
          }
        }
      );
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const retryMemberLookup = useCallback(
    () => setAttempt((value) => value + 1),
    []
  );

  const signedIn = isLoaded && !!userId;
  const member = state.userId === userId ? state.member : null;
  return {
    canMutate: signedIn && !!member,
    member,
    memberLookupFailed: signedIn && state.userId === userId && state.failed,
    retryMemberLookup,
    signedIn,
    unknownMember:
      signedIn &&
      state.userId === userId &&
      state.loaded &&
      !state.failed &&
      !member,
  };
}
