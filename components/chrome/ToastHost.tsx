"use client";

import { useEffect, useState } from "react";
import { type ActiveToast, dismissCurrentToast, subscribeToast } from "@/lib/toast";

export function ToastHost() {
  const [toast, setToast] = useState<ActiveToast | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  if (!toast) return null;

  return (
    <div
      id="wiki-toast"
      className={`wiki-toast visible${toast.variant ? ` wiki-toast--${toast.variant}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="wiki-toast-msg">{toast.message}</span>
      {toast.onUndo && (
        <button
          type="button"
          className="toast-undo-btn"
          onClick={() => {
            toast.onUndo?.();
            dismissCurrentToast();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
