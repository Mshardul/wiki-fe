# HTTP Caching and CDNs (`inside-http-caching-and-cdns`)

**Status:** draft

## Objective

Trace **GET** through **browser → CDN → origin** with **Cache-Control**, **ETag**, and **Vary**: store, revalidate, or **must not share**, and how a **wrong cache key** serves another user’s representation.

## Prereqs

- `inside-an-http-request` (proxy chain).

## Tracing device

**Whiteboard at the aha step (vary chip):** **cache shelf** keyed by URL; second key dimension for **Vary**. Two clients, one path; collision then split slots.

**Why:** edge bugs are usually **keying** bugs.

**Implementer note:** **new** — `cdn-cache-shelf` (2D key: URL × `Vary` dimension); origin hit/miss as thin request arrows, not a full HTTP pipeline replay.

## Scenarios

### happy — Public cacheable GET

Question: `GET /app.v123.js` with `Cache-Control: public, max-age=31536000, immutable` — who serves the second request?

Misconception: CDN always hits origin.

Interview question: Why hash in the filename?

Aha: step 2

Steps:

1. CDN **MISS**; origin **200** + cacheable headers; shelf slot created.
2. Second GET: CDN **HIT**; origin idle — **aha:** edge serves without origin load.
3. Shelf **Age** tick advances (abstract).

### private — Auth and no-store

Question: `GET /account` with `private, no-store` — can the shared CDN cache the body?

Misconception: CDNs always cache 200s.

Interview question: What if `Cache-Control` is stripped?

Aha: step 2

Steps:

1. Origin **200** + `Cache-Control: private, no-store`.
2. CDN obeys headers: **shelf empty**; second GET **MISS** to origin — **aha:** shared cache must not hold the body.

### etag — Revalidation

Question: `ETag: "abc"` and `max-age=0, must-revalidate` — next GET?

Misconception: `max-age=0` means no cache.

Interview question: 304 vs 200 to the client.

Aha: step 3

Steps:

1. CDN holds stale entry; ETag **abc**.
2. CDN → origin `If-None-Match: abc`.
3. Origin **304**; CDN serves stored body — **aha:** revalidate without full body.
4. ETag **def** on next origin change → origin **200**; shelf body replaced.

### vary — Wrong shared variant

Question: Same path, different `Accept` — cache by path only?

Misconception: URL is the only cache key.

Interview question: Role of `Vary: Accept`?

Aha: step 2

Steps:

1. Client A `Accept: application/json` → **200** JSON; shelf slot (path only).
2. Client B `Accept: text/html` → CDN **HIT** → **JSON body** to HTML client — **aha:** key collision.
3. Origin sends `Vary: Accept`; shelf shows **two slots** under the path.

## Read article

`/system-design/components/cdn/#cache-hit-path-vs-cache-miss-path`; `#cache-key-construction--fragmentation`; `#cache-poisoning-via-unkeyed-headers` (About / See also).

## Notes

- CDN **ignore-headers** misconfig: one sentence in About (no extra chip unless approved).
- Stampede visualizer = many misses; this page = **one** object’s HTTP caching rules.

## Approval

- [x] Reviewer pass
- [ ] Shardul
