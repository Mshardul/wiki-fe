# System Design Components Content Audit (wiki-fe)

**Date:** 2026-08-16
**Scope:** `content/system-design/components/*.md` (26 articles)
**Rubric:** `docs/_meta/ai-instructions/sd-rater.md` + `sd-writer.md` (publish gate: gated param ≤8 → NO-SHIP)
**Mode:** read-only critique; no content edits in this pass

## Executive summary

- **SHIP:** 7 / 26
- **NO-SHIP:** 19 / 26
- **Hub articles:** 1 (`authentication.md`) — scored on hub rubric; **SHIP**
- **Redirect stub (not a rateable article):** 1 (`load-balancer-consistent-hashing.md`) — 3-line pointer to `../algorithms/consistent-hashing.md`, no mandatory spine by design
- **Empty/skeleton stubs (0 real content):** 4 (`proxies.md`, `service-discovery.md`, `tracing.md`, `websockets-sse-long-polling.md`)
- **Partial/seeded stubs from `authentication.md` extraction:** 4 (`mtls.md`, `oauth-oidc.md`, `mfa.md`, `session-auth.md`, `service-to-service-auth.md` — 5 total, see below) — all carry the writer's own `<!-- Partial article - seeded from authentication.md -->` marker
- **Mean score (all 25 rateable, excl. redirect stub):** 62.4/100
- **Mean score (SHIP only):** 92.7/100
- **Mean score (NO-SHIP excl. 4 empty + 5 partial stubs):** 78.8/100

### Scoreboard

| Article | Score | Gate | Kind |
|---|---:|---|---|
| `api-gateway.md` | 92/100 | **SHIP** | specific |
| `authentication.md` | 96/100 | **SHIP** | hub |
| `blob-object-storage.md` | 93/100 | **SHIP** | specific |
| `caching.md` | 90/100 | **SHIP** | specific |
| `cdn.md` | 95/100 | **SHIP** | specific |
| `databases.md` | 84/100 | **NO-SHIP** | specific |
| `distributed-file-system.md` | 93/100 | **SHIP** | specific |
| `dns.md` | 88/100 | **NO-SHIP** | specific |
| `jwt.md` | 38/100 | **NO-SHIP** | partial stub |
| `load-balancer.md` | 79/100 | **NO-SHIP** | specific (R4 hub-shaped) |
| `load-balancer-consistent-hashing.md` | n/a | **NO-SHIP** | redirect stub |
| `logging.md` | 87/100 | **NO-SHIP** | specific |
| `message-queues.md` | 82/100 | **NO-SHIP** | specific |
| `metrics.md` | 91/100 | **SHIP** | specific |
| `mfa.md` | 71/100 | **NO-SHIP** | partial stub |
| `mtls.md` | 31/100 | **NO-SHIP** | partial stub |
| `oauth-oidc.md` | 52/100 | **NO-SHIP** | partial stub |
| `observability.md` | 90/100 | **NO-SHIP** | specific |
| `proxies.md` | 2/100 | **NO-SHIP** | empty stub |
| `rate-limiter.md` | 86/100 | **NO-SHIP** | specific |
| `search.md` | 90/100 | **NO-SHIP** | specific |
| `service-discovery.md` | 2/100 | **NO-SHIP** | empty stub |
| `service-to-service-auth.md` | 47/100 | **NO-SHIP** | partial stub |
| `session-auth.md` | 54/100 | **NO-SHIP** | partial stub |
| `tracing.md` | 3/100 | **NO-SHIP** | empty stub (headers only) |
| `websockets-sse-long-polling.md` | 2/100 | **NO-SHIP** | empty stub |

### SHIP list

- `api-gateway.md` — 92/100
- `authentication.md` — 96/100 (hub)
- `blob-object-storage.md` — 93/100
- `caching.md` — 90/100
- `cdn.md` — 95/100
- `distributed-file-system.md` — 93/100
- `metrics.md` — 91/100

## Systemic findings (P0 → P3)

### P0 — Unpublishable / empty inventory

1. **Four components are completely unwritten stubs**: `proxies.md`, `service-discovery.md`, `websockets-sse-long-polling.md` are title-only (no content beyond the H1). `tracing.md` has section headers but every one is a `<!-- TODO -->` placeholder. All four appear in the live wiki inventory as real pages but teach nothing. **Fix type:** write full Component spines from `sd-writer.md`, or remove from `index.md` until filled.
2. **`load-balancer-consistent-hashing.md` is a dead-weight redirect file, not an article** — 3 lines, points readers to `../algorithms/consistent-hashing.md` for the mechanics and to `load-balancer.md` for LB-specific usage, and explicitly states it's "kept only so existing links resolve." It correctly has no mandatory spine (by design, not oversight) but sits in the folder as if it were a 26th component. **Fix type:** either delete it and redirect any inbound links directly to `load-balancer.md#consistent-hashing` / `consistent-hashing.md`, or confirm it's intentionally kept as a redirect shim and exclude it from future rating passes of this folder.
3. **`jwt.md` is a self-declared partial stub** (`<!-- Partial article - seeded from authentication.md. Sections to be completed. -->`) missing TLDR, mental model, Quick Decision Guide, Comparison Matrix, Production Failure Modes, and the entire Interview Scenario Bank — despite what exists (Structure, Claims, Signing Algorithms, JWKS) being genuinely high-quality, senior-depth content. This is the highest-traffic prerequisite in the folder (linked from `authentication.md`, `oauth-oidc.md`, `service-to-service-auth.md`) and is the least finished of the five extraction targets relative to its importance.

### P1 — Recurring gate failures across otherwise strong articles

1. **`authentication.md`'s extraction left multiple seeded siblings genuinely half-finished**, not just `jwt.md`. `mtls.md` (31/100), `oauth-oidc.md` (52/100), `mfa.md` (71/100), `session-auth.md` (54/100), and `service-to-service-auth.md` (47/100) all carry the same `<!-- Partial article - seeded from authentication.md -->` / `<!-- To be written when this article is fully developed. -->` markers and share an identical failure signature: missing TLDR, missing mental model, missing Quick Decision Guide (CO2), missing Production Failure Modes & Gotchas (U12), and — the most consistent structural defect — a single Interview Lens block embedded mid-body instead of inside a consolidated `## Interview Scenario Bank` (U16 violation in 4 of 5). `mtls.md` is the furthest behind (82 lines total, no Interview Scenario Bank at all). The hub (`authentication.md`) itself is finished and ships clean — the debt is entirely on the member pages it spawned.
2. **TLDR word-cap violations on otherwise senior-depth, well-structured articles**: `rate-limiter.md` (105 words, ~2x the ≤50-word Component cap) and `search.md` (139 words, ~3x cap) are both single-blocker-away from SHIP — every other gated param clears 9, only the TLDR length trips the gate. Worth a portfolio-wide grep for other TLDRs over the word cap, since these two are otherwise the strongest NO-SHIP articles in the batch.
3. **`load-balancer.md` is R4 hub-shaped**: at 1003 lines it fully teaches three distinct mechanism families at interview depth under one unmarked specific article — 8 traffic-distribution algorithms (including a real, if correctly-deferred, consistent-hashing treatment), SSL/TLS handling (termination/passthrough/re-encryption/mTLS), and HA/resilience (VRRP, split-brain, floating IP, failover). Per `sd-writer.md`'s own split rule, this is a hub-conversion candidate, not a trim.
4. **U12 (failure modes, two-level pattern) capped on several near-SHIP articles**: `search.md` and `dns.md` both have a dedicated failure-modes section but no paired inline H3 layer (or vice versa) — the two-level pattern the writer spec requires isn't demonstrated even though the content that exists is solid.
5. **`databases.md`'s one blocker is a single mechanical link-format defect**: a live `[Bloom Filter](./bloom-filter.md)` link to a nonexistent file instead of the plain-text + `<!-- link: -->` comment pattern `authentication.md` itself correctly demonstrates for the same not-yet-written-sibling situation. One-line fix, otherwise 84/100.
6. **`message-queues.md`** (82/100): queue-vs-log decision restated a third time in Advanced Patterns (R1/U14), 894 lines over the soft ceiling (U15), and the saga pattern taught at near-full depth before its link-out (R8).

### P2 — Interview-prep portfolio gaps (advisory but systemic)

1. **U10 (interview soundbite) is soft across nearly the whole folder** — most TLDRs end on a decent closing sentence but rarely a distinctly set-off, quotable soundbite. `cdn.md` is the one clean exception with an explicit "Interview soundbite:" line. Worth a portfolio-wide nudge.
2. **`caching.md` is the length outlier among SHIP articles** (951 lines vs. next-largest SHIP article at ~310) — not hub-shaped (R4 checked explicitly, stays one mechanism with many facets) and not padded, but closest to the 900-line hub-shape signal in the batch, with the folder's only near-miss U14/R1 duplication (Cache Breakdown vs Cache Stampede mutex re-explanation) and an internal 0.3ms/0.5ms Redis-latency inconsistency.
3. **V9 cross-article consistency found zero genuine contradictions** across all pairwise same-chunk comparisons performed (Redis ~0.3ms, DB ~5-15ms, erasure-coding ~1.4-1.5x, BGP/DNS TTL framing, mTLS cert TTLs, chunk sizes — all mutually consistent everywhere they overlap). Chunking means no single rating pass checked all 25 same-folder siblings exhaustively per V9's own exhaustiveness requirement — a full-folder V9 sweep (not just intra-chunk) is recommended before the next portfolio publish push.
4. **DNS's Quick Decision Guide (CO2) is a flat bullet list**, the thinnest CO2 format in the folder versus the table/structured-guide format 8 other SHIP-adjacent articles use — 88/100, single blocker.

### P3 — Coverage / polish

1. **Vendor-example thinness**: `blob-object-storage.md` (8/10) and `dns.md` (8/10) have noticeably thinner real-world vendor coverage than SHIP siblings — not blocking, but worth a pass.
2. **Diagram thinness on internals-heavy articles**: `caching.md` (U5 6/10 — LRU linked-list, ARC four-list structure described in prose only) and `databases.md` (U5 7/10 — B-tree page update has no diagram to balance the LSM-tree one) both under-diagram spatial mechanisms despite being otherwise strong articles.
3. **Stale not-yet-written link hygiene**: the `<!-- link: file.md -->` convention is applied correctly in the large majority of prerequisite references across the folder, but `databases.md`'s bloom-filter link is a live violation (see P1.5) — worth a repo-wide grep for the same anti-pattern elsewhere.

## Content-backlog candidates

| Priority | Article | Fix type | Blocker summary |
|---|---|---|---|
| P0 | `proxies.md` | fill empty stub | Title-only, zero content — entire Component spine unwritten |
| P0 | `service-discovery.md` | fill empty stub | Title-only, zero content — entire Component spine unwritten |
| P0 | `websockets-sse-long-polling.md` | fill empty stub | Title-only, zero content — entire Component spine unwritten; decide single-article vs hub shape before writing |
| P0 | `tracing.md` | fill empty stub | Section headers only, all TODO placeholders — entire body unwritten |
| P0 | `load-balancer-consistent-hashing.md` | delete or confirm-as-redirect | 3-line dead-weight redirect masquerading as a 26th component; not a content gap, a housekeeping decision |
| P0 | `jwt.md` | complete partial stub | Missing TLDR, mental model, Quick Decision Guide, Comparison Matrix, Production Failure Modes, entire Interview Scenario Bank; highest-traffic unfinished prerequisite in the folder |
| P1 | `mtls.md` | complete partial stub | Furthest-behind authentication.md extraction (82 lines); missing TLDR, spine, Interview Scenario Bank, most senior facets |
| P1 | `session-auth.md` | complete partial stub | Missing TLDR, mental model, Quick Decision Guide, dedicated failure-modes section; embedded Interview Lens needs moving into a proper bank |
| P1 | `service-to-service-auth.md` | complete partial stub | Missing decision layer entirely (4 mechanisms with no "when which" comparison) — CO2/CO3 both absent |
| P1 | `oauth-oidc.md` | complete partial stub | Missing TLDR; single Interview Lens embedded mid-body instead of consolidated bank; missing token revocation/refresh-rotation coverage |
| P1 | `mfa.md` | complete partial stub | Missing TLDR; missing Quick Decision Guide + Resilience & Failure Handling entirely; push-MFA/fatigue-attack gap |
| P1 | `load-balancer.md` | hub-conversion review | R4 hub-shaped signal — 3 distinct mechanism families (algorithms, SSL/TLS, HA) fully taught under one unmarked specific article; also has a U14/R1 IP-hash/NAT hotspot duplication |
| P1 | `rate-limiter.md` | trim TLDR | Single blocker: TLDR 105 words vs ≤50-word cap; otherwise 86/100 and clean |
| P1 | `search.md` | trim TLDR + U12 fix | TLDR 139 words vs cap; also needs a consolidated failure-modes summary layer alongside existing H3 detail |
| P1 | `databases.md` | fix broken link | Live `[Bloom Filter](./bloom-filter.md)` link to nonexistent file — convert to plain-text + `<!-- link: -->` pattern |
| P1 | `dns.md` | restructure CO2 | Quick Decision Guide is a flat bullet list; restructure into table/structured format matching siblings |
| P1 | `logging.md` | strengthen U5 | Two pipeline diagrams are real but too thin (no backpressure/failure state shown, happy-path only) |
| P1 | `message-queues.md` | trim + U14/R8 | Queue-vs-log restated a third time in Advanced Patterns; 894 lines over ceiling; saga pattern near-fully taught before link-out |
| P1 | `observability.md` | close small gaps | Caching prerequisite never load-bearing in-body; missing cost-allocation/chargeback senior facet |
| P2 | `(portfolio)` | strengthen U10 | Add a distinct, quotable interview soundbite (not buried in TLDR) across most of the folder — `cdn.md` is the one clean model to copy |
| P2 | `caching.md` | maintenance trim review | 951 lines, closest to hub-shape signal in the batch; fix the internal 0.3ms/0.5ms Redis-latency inconsistency; consider extracting Performance & Capacity Planning or Security & Hardening |
| P2 | `(portfolio)` | full-folder V9 sweep | Chunked rating only checked intra-chunk siblings; run one full 25-article V9 pass before next publish push |

## Portfolio signals (pre-rate)

- Empty/title-only stubs: `proxies.md`, `service-discovery.md`, `websockets-sse-long-polling.md`
- Skeleton stub (headers + TODOs only): `tracing.md`
- Redirect-only non-article: `load-balancer-consistent-hashing.md`
- Partial/seeded stubs (writer's own marker): `jwt.md`, `mtls.md`, `oauth-oidc.md`, `mfa.md`, `session-auth.md`, `service-to-service-auth.md`
- Hub marker present: `authentication.md`
- `sd-check.sh`: script present at `scripts/sd-check.sh`; ran on all 25 rateable articles — U8 (filename) PASS on all; U9 (links resolve) FAIL only on `databases.md` (live broken link to `bloom-filter.md`)
- TLDR over the ≤50-word Component cap: `rate-limiter.md` (105 words), `search.md` (139 words)
- R4 hub-shaped signal flagged: `load-balancer.md`

## Per-article ratings

Full PARAM/SCORE/W/GATE/NOTE score tables, GATE verdicts, BLOCKERS, and ranked FIXES for all 26 files were produced during the chunked rating pass and are available in the rating agents' working transcripts. This report keeps the appendix to the digest sections above per the same consolidation approach the reference DSA content audit used (`dsa-data-structures-content-audit - 20260803.md`) — chunk rollups and full per-param tables were folded into the systemic findings and scoreboard above rather than duplicated here in full. Use the content-backlog prompt to turn the candidates above into backlog rows; the blocker summaries in that table are sufficiently concrete to drive fixes without re-deriving the full score tables.

**Notable per-article findings not already captured above:**

- `api-gateway.md` (92, SHIP) — clean; only advisory nits (soundbite positioning, U17 at-scale sentence could be more explicit)
- `authentication.md` (96, SHIP, hub) — clean; soundbite/Key Takeaway placement could be tightened
- `blob-object-storage.md` (93, SHIP) — clean; thin vendor examples (self-hosted alternatives like MinIO/Ceph unmentioned)
- `caching.md` (90, SHIP) — see P2.2 above
- `cdn.md` (95, SHIP) — strongest article in the folder; zero fixes needed
- `distributed-file-system.md` (93, SHIP) — clean; most thoroughly V9-cross-checked article given heavy sibling references
- `metrics.md` (91, SHIP) — clean, no blockers; strong V9 alignment with `observability.md`
