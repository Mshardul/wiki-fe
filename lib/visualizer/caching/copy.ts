import type { StrategyId, StrategyMeta } from "./types";

const ASK = "Ask the cache for {key}.";
const HIT = "Hit → return it.";
const APP_MISS = "Miss → read the DB, then put it in the cache.";
const CACHE_MISS = "Miss → the cache loads it from the DB.";

export const STRATEGY_META: Record<StrategyId, StrategyMeta> = {
  "cache-aside": {
    id: "cache-aside",
    name: "Cache-aside",
    chip: "Lanes",
    rule: "The app checks the cache, and on a miss loads from the DB and fills it.",
    lines: [ASK, HIT, APP_MISS, "Write → update the DB, then delete the cache key."],
    about: [
      ["Cost", "O(1) per request; the app owns the caching code"],
      ["Wins", "simple; the DB stays the source of truth; cache failure degrades to misses"],
      ["Loses", "cold misses hit the DB; a read racing a write can cache an old value"],
      ["Seen in", "Redis or Memcached in front of SQL, most web backends"],
    ],
    tries: [
      {
        title: "Force the stale-read race",
        blurb:
          "A read misses, a write lands before its answer is cached — the cache keeps the old value.",
        patch: { sequence: ["XA", "RA", "WA", "RA"] },
      },
      {
        title: "A quiet, read-heavy day",
        blurb: "Mostly hits — the cheap path cache-aside is built for.",
        patch: { sequence: ["RA", "RA", "RB", "RA", "RB", "RA"] },
      },
    ],
    anchor: "cache-aside-lazy-population",
    usesLifetime: false,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "read-through": {
    id: "read-through",
    name: "Read-through",
    chip: "Lanes",
    rule: "The cache loads missing keys from the DB itself.",
    lines: [
      "Ask the cache for {key}; the app never talks to the DB.",
      "Hit → the cache returns it.",
      "Miss → the cache loads it from the DB and keeps it.",
      "Write → update the DB only; the cached copy ages out.",
    ],
    about: [
      ["Cost", "O(1) per request; the cache needs a loader"],
      ["Wins", "app code only talks to the cache"],
      ["Loses", "writes bypass the cache, so entries lag until they expire"],
      ["Seen in", "Caffeine, NCache, some Redis client wrappers"],
    ],
    tries: [
      {
        title: "Stale until it expires",
        blurb: "A write skips the cache, so the cached copy lags until its 3-tick lifetime ends.",
        patch: { sequence: ["RA", "WA", "RA", "RA", "RA", "RA"], lifetime: 3 },
      },
      {
        title: "Short lifetime",
        blurb: "A 2-tick lifetime means a DB read every other request.",
        patch: { sequence: ["RA", "RA", "RA", "RA", "RA", "RA"], lifetime: 2 },
      },
    ],
    anchor: "read-through",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "write-through": {
    id: "write-through",
    name: "Write-through",
    chip: "Lanes",
    rule: "Every write goes to the cache and the DB before it is acknowledged.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the cache and the DB together, then acknowledge.",
    ],
    about: [
      ["Cost", "writes pay a cache and a DB round trip"],
      ["Wins", "reads always see fresh data"],
      ["Loses", "write latency; every write is cached even if never re-read"],
      ["Seen in", "DynamoDB DAX, ORM second-level caches"],
    ],
    tries: [
      {
        title: "Every write pays twice",
        blurb: "Cache and DB are both written before the acknowledgement: 4 ticks per write.",
        patch: { sequence: ["WA", "WA", "WA"] },
      },
      {
        title: "A crash costs nothing",
        blurb: "The DB already has every write, so losing the cache loses no data.",
        patch: { sequence: ["WA", "WA", "!", "RA"] },
      },
    ],
    anchor: "write-through",
    usesLifetime: false,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "write-behind": {
    id: "write-behind",
    name: "Write-behind",
    chip: "Lanes",
    rule: "Acknowledge writes from the cache, flush them to the DB later.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the cache, acknowledge, and queue it for the DB.",
      "Every few requests → flush the queue to the DB in one batch.",
    ],
    about: [
      ["Cost", "writes cost one cache round trip; the DB sees batches"],
      ["Wins", "lowest write latency; repeated writes to a key coalesce"],
      ["Loses", "acknowledged writes are lost if the cache dies before a flush"],
      ["Seen in", "database write buffers, JPA and Hazelcast write-behind stores"],
    ],
    tries: [
      {
        title: "Lose a write",
        blurb: "Crash before the next flush and both acknowledged writes vanish.",
        patch: { sequence: ["WA", "WB", "!", "RA"], flushEvery: 5 },
      },
      {
        title: "Fast, batched writes",
        blurb:
          "Each write costs one cache round trip, and the flush turns four writes into one DB write.",
        patch: { sequence: ["WA", "WA", "WA", "WA"], flushEvery: 4 },
      },
    ],
    anchor: "write-behind-write-back",
    usesLifetime: false,
    usesFlush: true,
    metricLabel: "Lost writes",
  },
  "write-around": {
    id: "write-around",
    name: "Write-around",
    chip: "Lanes",
    rule: "Writes go to the DB and skip the cache.",
    lines: [ASK, HIT, APP_MISS, "Write → go straight to the DB; the cache is bypassed."],
    about: [
      ["Cost", "writes cost one DB round trip"],
      ["Wins", "write-heavy, rarely re-read data doesn't flood the cache"],
      ["Loses", "a cached copy goes stale after a write until it expires"],
      ["Seen in", "log and event ingestion, bulk loads"],
    ],
    tries: [
      {
        title: "Writes skip the cache",
        blurb: "A write goes straight to the DB, so the cached copy goes stale.",
        patch: { sequence: ["RA", "WA", "RA", "WA", "WA"] },
      },
      {
        title: "Write-heavy traffic",
        blurb: "Only writes — the cache is never filled or churned.",
        patch: { sequence: ["WA", "WB", "WA", "WB", "WA"] },
      },
    ],
    anchor: "write-around",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "refresh-ahead": {
    id: "refresh-ahead",
    name: "Refresh-ahead",
    chip: "Lanes",
    rule: "Reload hot entries just before they expire.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the DB only.",
      "Hit on an entry close to expiry → refresh it in the background.",
    ],
    about: [
      ["Cost", "background DB reads for hot keys"],
      ["Wins", "hot keys avoid the miss at expiry"],
      ["Loses", "refreshes keys that may never be read again"],
      ["Seen in", "Caffeine refreshAfterWrite, CDN stale-while-revalidate"],
    ],
    tries: [
      {
        title: "Hot keys never miss",
        blurb: "One miss, then hits — and a background refresh near expiry keeps the key warm.",
        patch: { sequence: ["RA", "RA", "RA", "RA", "RA", "RA"], lifetime: 6 },
      },
      {
        title: "Short lifetime, constant refresh",
        blurb: "With a 2-tick lifetime every hit triggers a refresh.",
        patch: { sequence: ["RA", "RA", "RA", "RA"], lifetime: 2 },
      },
    ],
    anchor: "refresh-ahead",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
};
