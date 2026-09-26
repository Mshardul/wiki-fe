"use client";

import { useEffect, useState } from "react";
import { evictArticle, isSaved, saveArticle } from "@/lib/pwa/article-cache";
import { showToast } from "@/lib/toast";

export function SaveOffline({ articlePath }: { articlePath: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void isSaved(articlePath).then((v) => {
      if (alive) setSaved(v);
    });
    return () => {
      alive = false;
    };
  }, [articlePath]);

  const toggle = () => {
    if (busy) return;
    void (async () => {
      setBusy(true);
      try {
        if (saved) {
          await evictArticle(articlePath);
          setSaved(false);
          showToast("Removed from offline reading");
        } else {
          const ok = await saveArticle(articlePath);
          if (ok) {
            setSaved(true);
            showToast("Saved for offline reading", { variant: "success" });
          } else {
            showToast("Couldn't save article for offline reading", { variant: "error" });
          }
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <button
      type="button"
      className={`topbar-icon-btn${saved ? " active" : ""}${busy ? " loading" : ""}`}
      aria-pressed={saved}
      title={saved ? "Saved offline — click to remove" : "Save current article for offline reading"}
      aria-label={saved ? "Remove offline copy" : "Save for offline"}
      onClick={toggle}
    >
      <svg className="icon" aria-hidden="true">
        <use href={saved ? "#icon-check" : "#icon-download"} />
      </svg>
    </button>
  );
}
