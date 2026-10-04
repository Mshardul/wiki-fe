"use client";

import { useEffect } from "react";
import { openAuthModal } from "@/components/auth/authModalController";
import { discardUnowned } from "@/lib/storage/outbox";
import { bindCrossTabSession, getSession, initSession } from "@/lib/storage/session";
import { clearUserDataCache, flushOutbox, pullAll } from "@/lib/storage/sync";

export function SessionInit() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initSession();
      if (cancelled) return;
      if (getSession().status === "in") await pullAll();
      else discardUnowned();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    })().catch(discardUnowned);

    const onOnline = () => void flushOutbox();
    window.addEventListener("online", onOnline);

    const unbind = bindCrossTabSession((wasIn) => {
      const nowIn = getSession().status === "in";
      if (nowIn && !wasIn) void pullAll();
      else if (!nowIn && wasIn) clearUserDataCache();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    });

    // Verify / reset deep links: ?mode=verify|reset&token=… — consume then strip so a refresh won't re-fire.
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    const token = params.get("token");
    if (mode && token) {
      if (mode === "verify") openAuthModal("verify-result", token);
      else if (mode === "reset") openAuthModal("reset", token);
      const url = new URL(location.href);
      url.searchParams.delete("mode");
      url.searchParams.delete("token");
      history.replaceState(null, "", url.toString());
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      unbind();
    };
  }, []);

  return null;
}
