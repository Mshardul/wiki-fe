"use client";

import { useSyncExternalStore } from "react";
import { getSession, type Session, subscribeSession } from "@/lib/storage/session";

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
