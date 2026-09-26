"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useBookmarks } from "@/components/sync/useSyncedDomain";

export function BookmarksModal() {
  const [open, setOpen] = useState(false);
  const { value: bookmarks, toggle } = useBookmarks();
  const router = useRouter();

  useEffect(() => {
    // lib/hotkeys.ts owns the ⌘B keydown; a second listener here raced it and cancelled the open.
    const onOpenEvt = () => setOpen((v) => !v);
    document.addEventListener("wiki:open-bookmarks", onOpenEvt);
    return () => document.removeEventListener("wiki:open-bookmarks", onOpenEvt);
  }, []);

  function goTo(b: (typeof bookmarks)[number]) {
    setOpen(false);
    router.push(`/${b.wikiId}/${b.slug}/`);
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      label="Bookmarks"
      className="bookmarks-modal-dialog"
      backdropClassName="bookmarks-modal"
    >
      <div id="bookmarks-modal-list" className="bookmarks-modal-list">
        {bookmarks.length === 0 ? (
          <p className="recents-empty">
            {"// no bookmarks anywhere yet — press "}
            <kbd>b</kbd>
            {" on any article"}
          </p>
        ) : (
          bookmarks.map((b) => (
            <div className="bookmarks-modal-item" key={`${b.wikiId}|${b.path}`}>
              <button type="button" className="bookmarks-modal-entry" onClick={() => goTo(b)}>
                <span className="bookmarks-modal-entry-title">{b.title}</span>
                <span className="bookmarks-modal-entry-wiki">{b.wikiTitle}</span>
              </button>
              <button
                type="button"
                className="bookmarks-modal-remove"
                title="Remove bookmark"
                aria-label="Remove bookmark"
                onClick={() => toggle(b.wikiId, b.path, b.title)}
              >
                <svg className="icon" aria-hidden="true">
                  <use href="#icon-x" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
