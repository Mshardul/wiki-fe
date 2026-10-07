"use client";

import { useSyncExternalStore } from "react";
import { getSession, type Session, subscribeSession } from "@/lib/storage/session";

// Stable reference: useSyncExternalStore loops if the server snapshot is a new object each call.
const SERVER_SESSION: Session = { user: null, status: "loading" };

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
    () => SERVER_SESSION,
  );
}
