"use client";

import { useSession } from "@/components/sync/useSession";
import { logoutFlow } from "@/lib/auth/authFlows";
import { showToast } from "@/lib/toast";
import { openAuthModal } from "./authModalController";

// Topbar auth control. Ported from js/auth.js Auth.refreshButtons / Auth.toggle.
export function AuthButton() {
  const { status } = useSession();
  const loggedIn = status === "in";

  return (
    <button
      type="button"
      className="topbar-icon-btn topbar-auth-btn"
      title={loggedIn ? "Log out" : "Log in"}
      onClick={() => {
        if (loggedIn) {
          void logoutFlow().then(() => showToast("Logged out", { variant: "success" }));
        } else {
          openAuthModal("login");
        }
      }}
    >
      <svg className="icon" aria-hidden="true">
        <use href="#icon-user" />
      </svg>
      <span className="auth-btn-label">{loggedIn ? "Log out" : "Log in"}</span>
    </button>
  );
}
