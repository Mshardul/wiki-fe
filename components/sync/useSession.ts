"use client";

import { useSyncExternalStore } from "react";
import { getSession, type Session, subscribeSession } from "@/lib/storage/session";

// Exposes { user, status }, updating on wiki:session-changed / wiki:session-expired and the
// cross-tab storage event. Ported from the js/auth.js SESSION_SYNC_KEY listener.
export function useSession(): Session {
  return useSyncExternalStore(
    (cb) => {
      const unsub = subscribeSession(cb);
      const onEvt = () => cb();
      document.addEventListener("wiki:session-changed", onEvt);
      document.addEventListener("wiki:session-expired", onEvt);
      return () => {
        unsub();
        document.removeEventListener("wiki:session-changed", onEvt);
        document.removeEventListener("wiki:session-expired", onEvt);
      };
    },
    getSession,
    (): Session => ({ user: null, status: "loading" }),
  );
}
