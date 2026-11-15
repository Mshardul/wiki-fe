"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import {
  _setMigratePending,
  type MigrateChoice,
  registerMigrateModal,
} from "./migrateDataController";

export function MigrateDataModal() {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((c: MigrateChoice) => void) | null>(null);

  useEffect(
    () =>
      registerMigrateModal((resolve) => {
        resolveRef.current = resolve;
        setOpen(true);
      }),
    [],
  );

  function choose(c: MigrateChoice) {
    resolveRef.current?.(c);
    resolveRef.current = null;
    _setMigratePending(false);
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => choose("discard")}
      label="Save your local data"
      className="migrate-dialog"
      backdropClassName="migrate-modal"
    >
      <h2 className="migrate-title">Keep your local data with your account?</h2>
      <p className="migrate-copy">
        You have bookmarks and reading history saved on this device. Keep them so they travel with
        your account, or discard them — they stay on this device either way. Notes and highlights
        are never uploaded or cleared by this choice.
      </p>
      <div className="migrate-actions">
        <button type="button" className="migrate-btn" onClick={() => choose("discard")}>
          Discard
        </button>
        <button
          type="button"
          className="migrate-btn migrate-btn--primary"
          onClick={() => choose("keep")}
        >
          Keep
        </button>
      </div>
    </Modal>
  );
}
