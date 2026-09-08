"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type Bookmark,
  getBookmarksSnapshot,
  subscribeBookmarks,
  toggleBookmark,
} from "@/lib/storage/bookmarks";
import { getRecentsSnapshot, type Recent, subscribeRecents } from "@/lib/storage/recents";

const EMPTY: never[] = [];

// Gives a component the local value of a synced domain, re-rendering on same-tab writes and the
// cross-tab storage event. Writes go through the domain module's cache-through path.
export function useBookmarks(): {
  value: Bookmark[];
  toggle: (wikiId: string, path: string, title?: string) => boolean;
} {
  const value = useSyncExternalStore(
    subscribeBookmarks,
    getBookmarksSnapshot,
    () => EMPTY as Bookmark[],
  );
  const toggle = useCallback(
    (wikiId: string, path: string, title?: string) => toggleBookmark(wikiId, path, title),
    [],
  );
  return { value, toggle };
}

export function useRecents(): { value: Recent[] } {
  const value = useSyncExternalStore(subscribeRecents, getRecentsSnapshot, () => EMPTY as Recent[]);
  return { value };
}
