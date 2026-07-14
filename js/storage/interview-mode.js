import { removeLocalStorageByPrefix } from "../state.js";

/* ─── Interview Mode Elapsed-Time Log ─── */
const INTERVIEW_PREFIX = "wiki-interview-";
const _keyFor = (wikiId, articlePath) =>
  `${INTERVIEW_PREFIX}${wikiId}-${articlePath.replace(/\//g, "-")}`;

const LOG_MAX = 10;

const InterviewLog = {
  get(wikiId, articlePath) {
    try {
      return JSON.parse(localStorage.getItem(_keyFor(wikiId, articlePath))) || [];
    } catch {
      return [];
    }
  },
  add(wikiId, articlePath, elapsedMs) {
    const key = _keyFor(wikiId, articlePath);
    const entries = InterviewLog.get(wikiId, articlePath);
    entries.push({ completedAt: new Date().toISOString(), elapsedMs });
    localStorage.setItem(key, JSON.stringify(entries.slice(-LOG_MAX)));
  },
  // wikiId omitted clears every wiki's logs; passed, scopes to that wiki.
  clear(wikiId) {
    removeLocalStorageByPrefix(wikiId ? `${INTERVIEW_PREFIX}${wikiId}-` : INTERVIEW_PREFIX);
  },
};

export { InterviewLog };
