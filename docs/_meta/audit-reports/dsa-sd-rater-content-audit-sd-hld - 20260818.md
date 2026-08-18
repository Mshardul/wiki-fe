# System Design HLD Content Audit (wiki-fe)

**Date:** 2026-08-18
**Scope:** `content/system-design/hld/*.md` (5 articles)
**Rubric:** `docs/_meta/ai-instructions/sd-rater.md` + `sd-writer.md` (publish gate: gated param ≤8 → NO-SHIP)
**Mode:** read-only critique; no content edits in this pass
**Related:** same rater-audit family as pending `dsa-sd-rater-content-audit-sd-components - 20260816.md` and `dsa-sd-rater-content-audit-sd-algorithms - 20260818.md` (different categories; not re-runs)

## Executive summary

- **SHIP:** 0 / 5
- **NO-SHIP:** 5 / 5
- **Hub / cheatsheet / path articles:** 0 — all five scored as HLD specific
- **Unfilled-skeleton stubs:** 1 (`youtube-video-streaming.md`) — title-only page (`# Design: Youtube Video Streaming`)
- **Mean score (all):** 70.4/100
- **Mean score (SHIP only):** n/a (no SHIP)
- **Mean score (NO-SHIP excl. stubs):** 83.3/100

The four written HLDs are interview-shaped (spine, Scenario Bank, Trade-off Summary, First 30 seconds, sd-check U8/U9 clean) and sit in the low-80s. Every one still NO-SHIPs on the same two habits: TLDR over the 50-word U4 cap, and the core design trade restated in Decision Framework + HL6 + (often) appendix Selection Matrix (R1, weight 3). `url-shortener.md` is the weakest written page (sibling ID-gen not intro+linked; generation taught twice). `youtube-video-streaming.md` is empty inventory, not a draft.

### Scoreboard

| Article | Score | Gate | Kind |
|---|---:|---|---|
| `distributed-cache.md` | 83/100 | **NO-SHIP** | HLD specific |
| `distributed-id-generator.md` | 87/100 | **NO-SHIP** | HLD specific |
| `key-value-store.md` | 82/100 | **NO-SHIP** | HLD specific |
| `url-shortener.md` | 81/100 | **NO-SHIP** | HLD specific |
| `youtube-video-streaming.md` | 19/100 | **NO-SHIP** | HLD specific (stub) |

### SHIP list

- (none)

## Systemic findings (P0 → P3)

### P0 — Unpublishable / empty inventory

1. **`youtube-video-streaming.md` is a one-line title stub.** Filename and H1 exist; no Prerequisites, TOC, TLDR, architecture, capacity, trade-off log, or Scenario Bank. It appears in the HLD folder as a real page and teaches nothing. **Fix type:** author a full HLD specific article (upload / transcode / CDN / ABR) via the writer, or drop it from the index until filled.

### P1 — Recurring gate failures across otherwise strong articles

1. **U4 TLDR over 50 words on every written HLD** (`distributed-cache` 81w, `distributed-id-generator` ~98–101w, `key-value-store` ~81–87w, `url-shortener` 73–74w). Thesis sentences are present; the paragraph is a mini-essay. Cut to ≤50 words and keep the last sentence as the speakable thesis.
2. **R1: the same comparison is fully stated in the body DF, the HL6 Why cell, and often an Appendix Selection Matrix.** Hits `distributed-cache` (CH vs hash-slots, cap 5), `key-value-store` (LSM vs B-tree ×4, cap 2), `url-shortener` (generation approaches ×3, cap 5), and a milder triple on `distributed-id-generator` (counter vs UUID vs Snowflake). Weight-3; this is the SHIP-killer on pages that otherwise clear HL1–HL6. Keep the comparison in one table; HL6 Why = one sentence + anchor; delete duplicate appendix matrices.
3. **U12 advisory, 4/4 written pages:** Production Failure Modes exists as a summary H2 of bullets; no inline `###` failure-mode headings in parent sections (cap 6). Same template gap, not four independent bugs.
4. **HL3 DAU→QPS derivation skipped** on `distributed-cache` (50M DAU → 40K peak asserted) and `key-value-store` (starts at key-count, not DAU). `distributed-id-generator` and `url-shortener` do the arithmetic — copy that pattern.
5. **`url-shortener.md` uniqueness-off-hot-path is sibling-shaped (U21 + R8).** Thesis is decentralized unique codes, but `distributed-id-generator.md` is never intro+linked; range/ZK uniqueness is taught at full depth here. Keep base62 / 301 vs 302 / custom alias / click-batch on this page.

### P2 — Interview-prep portfolio gaps (advisory but systemic)

1. **HLD folder coverage is five filenames, one empty.** No chat, news feed, ride-hailing, search, or notification HLD. Worse than missing: listing YouTube streaming while empty.
2. **U6 three-way approach tables missing** on `distributed-id-generator` and `url-shortener` (prose+DF instead of a ≤4-col table). `key-value-store` already has the LSM vs B-tree table — that is the shape the other two need.
3. **`distributed-id-generator.md` V7:** `sharding-strategies` is listed as a prereq but is adjacency, not a Snowflake dependency. Consensus-for-lease is the stretch-but-real dep; sharding is not.

### P3 — Coverage / polish

1. **H3s in the four written pages are appendix-only** (Misconceptions / Acronyms / Anti-patterns / Selection Matrix). No inline failure-mode or Deep-Dive H3s — same U12 signal as P1.3.
2. **U13/U17 on `url-shortener`:** storage vendors named (DynamoDB/Cassandra); no Bitly-class product as the workhorse example.
3. **V4 on `url-shortener`:** mapping store called both leader-follower and DynamoDB/Cassandra (those are not classic L-F). Internal terminology, not a V9 clash with `key-value-store.md`'s leaderless design.

## Content-backlog candidates

| Priority | Article | Fix type | Blocker summary |
|---|---|---|---|
| P0 | `youtube-video-streaming.md` | fill stub | Title-only page; write full HLD (ABR/CDN/transcode) or unpublish from index |
| P1 | `key-value-store.md` | R1 + U15 + U4 + HL3 | LSM vs B-tree restated in table + DF + HL6 + appendix (cap 2); Deep-Dive re-teaches memtable→SSTable; TLDR >50w; DAU→QPS missing |
| P1 | `distributed-cache.md` | R1 + U21 + U4 + U6 + HL5 + HL3 | CH vs slots ×3; no invalidation choice/link to `caching.md`; 81w TLDR; no partitioning table; no key/TTL schema; 40K peak underived |
| P1 | `url-shortener.md` | R1 + U21/R8 + U4 + U6 + U15 + U23 + HL4/HL6 + V1 | Generation trade ×3; no intro+link to `distributed-id-generator.md`; 74w TLDR; no generation table; Deep-Dive restates approaches; Q3 leaks auto-increment; no write-path sequence; HL6 reprints DFs; md5[:7] underspecified |
| P1 | `distributed-id-generator.md` | U4 + U6 + R1 + V7 + HL5 | ~100w TLDR; no Counter/UUID/Snowflake table; 3-way restated in list+DF+HL6; drop or replace `sharding-strategies` prereq; label 41/10/12 layout as data model |
| P2 | `(portfolio)` | U12 inline failure H3s | Add `###` failure-mode headings in parent sections on all four written HLDs; summary H2 points at them |
| P2 | `(portfolio)` | U4 TLDR pass | One ≤50-word TLDR rewrite across the four written pages (same defect, four files) |

## Portfolio signals (pre-rate)

- Stub (title-only, 1 line): `youtube-video-streaming.md`
- Hub marker: none
- Mechanical TLDR word counts (body under `## TLDR`): `distributed-cache` 81, `distributed-id-generator` 98, `key-value-store` 81, `url-shortener` 73 — all over U4's 50-word cap; stub has no TLDR
- `## Interview Scenario Bank` present: all four written pages; stub missing
- `## Production Failure Modes & Gotchas` present: all four written; stub missing
- `## Trade-off Summary` present: all four written; stub missing
- First 30 seconds framing: present in all four written; stub missing
- Appendix `### Selection Matrix`: `distributed-cache.md`, `key-value-store.md` (R1 fuel)
- Standalone Interviewer Probes H2: none
- Post-mortem / Further-Reading H2: none
- `scripts/sd-check.sh` on `content/system-design/hld/*.md`: **all U8/U9 PASS** (including the stub: no links to resolve)
- Line counts: cache 196, id-gen 194, kv 207, url 192, youtube 1
- V9 same-folder: no numeric contradictions among the four written pages; Snowflake vs URL key-pool treated as different ID shapes

## Per-article ratings

One score table per article. Chunk rollup summaries were folded into systemic findings above and dropped here. Use `.prompts/fe-audit-reports-to-content-backlog.md` to turn candidates into `SD-xxx` rows — never `WIKI-xxx`.

distributed-cache.md  -  83/100  -  NO-SHIP   [type: HLD]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   one-liner + thesis: every availability/consistency mechanism must be nearly free on the read path
U2 prerequisites format        9/10    1    gate   Name+tier only; Caching + Consistent Hashing are real deps; Replication Should-read is fair
U3 TOC                         10/10   0.5  gate   flat H2 list matches body
U4 TLDR                        6/10    1    gate   thesis present but 81 words (limit ≤50) / 2 sentences — BLOCKER
U5 diagrams                    9/10    1    gate   ASCII cluster + read-path sequence (miss→DB→SET); write path not sequenced but HL4 needs only one
U6 tables                      8/10    1    gate   HL6 is a real table; partitioning 3-way lives as DF prose + appendix matrix rather than one body table
U7 format spine                9/10    1    gate   Title→Prereqs→TOC→TLDR→body→Trade-off→Scenario Bank→Appendices; no YAML
U8 filename convention         10/10   0.5  gate   PASS - distributed-cache.md: ok (sd-check.sh)
U9 links resolve               10/10   1    gate   PASS - all .md links resolve (sd-check.sh)
U10 soundbite                  8/10    0.5  adv    TLDR second sentence is speakable but buried in an over-limit paragraph, not marked as a takeaway
U11 callout usage              9/10    0.5  adv    DF / Thought Process / Gotcha used for real trades (CH vs slots, async vs DB instinct, TTL jitter)
U12 failure modes two-level    6/10    1    adv    summary H2 is a bullet list; no inline failure-mode H3s in parent sections (cap 6)
U13 vendor examples            9/10    0.5  adv    Redis Cluster, Twemproxy, Twitter/Instagram-era Memcached fleets — generic mechanics stay generic
R1 no duplicate content        5/10    3    gate   CH vs static hash-slots fully stated in DF (Partitioning), HL6 row, AND Appendix Selection Matrix — cap 5 (2-line: weight-3)
U15 section length proportionality 9/10 2 gate   197 lines, no H2 near 150–250; short because dense, not padded
U16 consolidated interview lens 9/10   3    gate   one Scenario Bank, 3 lenses, no per-H2 Q&A, no Probes H2
U22 follow-up probe content    9/10    1    gate   hot-key, rebalance-vs-capacity detection, backing-store sizing — distinct from each Q
U23 Q/probe leak               9/10    1    gate   no Q/Next names consistent hashing / coalescing / circuit breaker as the answer
U17 real-world + at-scale      9/10    0.5  adv    Memcached fleets + rebalance stampede / hot-key as the 10x failure
U19 common misconceptions      9/10    0.5  adv    two mental-model fixes (stable node forever; cache implies DB consistency)
U20 first 30 seconds           9/10    1    gate   spoken scoping script (workload type → working set → partition/repl/evict); HLD-gated
U21 in-scope coverage          5/10    2    gate   write-invalidation / cache-aside vs write-through vs TTL vs pub-sub never chosen on-page and no intro+link in body (caching.md is only a prereq) — cap 5 (2-line: weight-2)
R2 length ceiling              9/10    0.5  adv    under ~400–700 and per-H2 soft caps
R3 section-overlap             8/10    0.5  adv    Replication section partly restates TLDR latency-vs-durability before adding async-vs-sync
R4 hub-shaped signal           9/10    0.5  adv    one system (distributed cache); CH/replication are intro+link not second mechanisms
R5 scenario-bank overweight    9/10    0.5  adv    Scenario Bank ~12% of article
R6 reading-order coherence     9/10    0.5  adv    capacity → architecture → partition → repl → eviction → rebalance; DFs after options
R7 redundant-in-spirit         7/10    0.5  adv    rebalance stampede retold in Deep-Dive + Failure Modes + Scenario Q2; keep Deep-Dive, trim the other two to pointers
R8 out-of-scope teaching       9/10    1    gate   CH / replication / circuit-breaker are intro+link, not full sibling articles
HL1 system thesis              9/10    1    gate   “core architectural challenge” explicit in TLDR
HL2 requirements & scope       9/10    1    gate   latency>durability and AP>CP have winners+why; security (mTLS/secret, TLS in transit, at-rest scoped out) present
HL3 capacity estimation        8/10    1    gate   DAU→QPS→storage→bw+constraint present; 50M DAU → 40K peak not derived (3x avg asserted)
HL4 high-level architecture    9/10    1    gate   component ASCII + read sequence; smart-client vs proxy named
HL5 data model & storage       7/10    1    gate   sharding/repl/eviction/TTL present; no explicit key/value/TTL schema
HL6 trade-off summary          9/10    2    gate   decision-log table; rejected options reasonable; smart-client operational cost named
V1 numeric claim verification  9/10    2    gate   10M×2KB=20GB; 40K×2KB≈80MB/s; 16384 slots; 1/N remap — all right order of magnitude
V2 diagram-text agreement      9/10    0.5  adv    client→hash→nodes A/B/C + gossip matches prose; miss path matches sequence
V3 comparison table accuracy   9/10    0.5  adv    CH vs slots / Redis Cluster 16384 / Memcached fleets — accurate
V4 terminology precision       9/10    0.5  adv    CAP AP vs backing-store SoT; durability vs latency not swapped
V5 capacity estimation sanity  7/10    0.5  adv    storage/bw arithmetic holds; DAU→QPS jump (50M DAU to 13K avg reads) unexplained
V6 trade-off summary accuracy  9/10    0.5  adv    each HL6 Why is argued in Partitioning/Replication/Architecture/Deep-Dive
V7 prerequisite necessity      9/10    1    gate   Caching (aside/TTL/evict), CH (ring), replication (async replicas) are real deps
V8 assumptions (algorithms)    n/a     -    -      (not an Algorithm article)
V9 cross-article consistency   9/10    1    gate   vs id-gen / kv / url / youtube stub: 1/N remap, hot-key, AP-cache vs quorum-KV are scoped differently, no numeric clash (2-line: weight-1)
V10 at-scale + probe accuracy  9/10    0.5  adv    stampede/hot-key real; three probe answers factually sound
CO1–CO4                        n/a     -    -      (HLD article — Component params)
AL1–AL7                        n/a     -    -      (HLD article — Algorithm params)
DV1–DV4                        n/a     -    -      (HLD article — DevOps params)
H1–H3 / P1–P3                  n/a     -    -      (not hub/path; no Hub marker)
--------------------------------------------------------------------------------

GATE: NO-SHIP - 6 gated params below 9 (R1, U21, U4, U6, HL5, HL3).

BLOCKERS (gated, score ≤8 - fix before publish):
- R1: keep partitioning comparison in ONE place — recommend Appendix Selection Matrix or the Partitioning DF, not both; HL6 row should link back (`see Data Partitioning`) instead of restating CH vs slots
- U21: add 2–3 sentences + link on invalidation (cache-aside vs write-through vs TTL vs pub/sub) pointing at `../components/caching.md`, and state this design’s default
- U4: cut TLDR to ≤50 words; keep the speed-vs-safety thesis as the last sentence
- U6: promote CH vs modulo vs hash-slots to a ≤4-col body table once; delete the duplicate appendix matrix or the DF prose
- HL5: add a minimal schema (key, value, ttl, version/replica-id) and state in-memory engine + vnode placement
- HL3: show DAU → avg QPS → peak (3x) arithmetic before the 40K figure

FIXES (ranked, highest-impact first = weight tier, then score gap):
1. R1: delete Appendix Selection Matrix (or replace DF with a link to it) so CH vs slots is fully stated once
2. U21: intro+link invalidation in Replication & Consistency (or a short Invalidation subsection) to `caching.md`
3. U4: rewrite TLDR to ≤50 words
4. U6: one partitioning table in Data Partitioning; HL6 Why stays one sentence + anchor link
5. HL5: explicit key/value/TTL schema under a Data Model heading (can be inside Partitioning)
6. HL3: derive 40K from 50M DAU (state reqs/user/day)
7. U12 (adv): add inline H3 failure modes (stampede, cascade, TTL herd) that the summary H2 can point at
8. R7: Scenario Q2 Ideal answer should pointer-link Deep-Dive instead of retelling pre-warm/gradual shift

---

distributed-id-generator.md  -  87/100  -  NO-SHIP   [type: HLD]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   uniqueness without a shared counter; clocks-and-identity thesis in TLDR
U2 prerequisites format        9/10    1    gate   Name+tier only, two Should-read; format correct (necessity scored on V7)
U3 TOC                         10/10   0.5  gate   matches all H2s
U4 TLDR                        6/10    1    gate   101 words (limit ≤50) — BLOCKER
U5 diagrams                    9/10    1    gate   in-process node + startup lease; generation sequence includes clock-skew branch
U6 tables                      7/10    1    gate   three-way counter vs UUID vs Snowflake is prose+DF, not a ≤4-col table — BLOCKER
U7 format spine                9/10    1    gate   spine intact, Trade-off before Appendices
U8 filename convention         10/10   0.5  gate   PASS - distributed-id-generator.md: ok (sd-check.sh)
U9 links resolve               10/10   1    gate   PASS - all .md links resolve (sd-check.sh)
U10 soundbite                  8/10    0.5  adv    thesis is speakable but not a standalone marked soundbite
U11 callout usage              9/10    0.5  adv    two DFs (approach, worker-ID) + clock-skew Gotcha + bit-width Thought Process
U12 failure modes two-level    6/10    1    adv    summary bullets only; clock skew lives as Gotcha not an inline H3 (cap 6)
U13 vendor examples            9/10    0.5  adv    Twitter Snowflake, Instagram, Discord, ZooKeeper/etcd — no vendor internals
R1 no duplicate content        8/10    3    gate   3-way approach fully in Strategies list, DF immediately after, and HL6 row; not a 2-table cap but not once
U15 section length proportionality 9/10 2 gate   195 lines; Deep-Dive is the justified nest (bit layout + skew)
U16 consolidated interview lens 9/10   3    gate   3 lenses in one bank; no leak sections
U22 follow-up probe content    9/10    1    gate   NTP 50ms jump, UUID-if-unsorted, ZK-down-on-boot — genuine follow-ups
U23 Q/probe leak               9/10    1    gate   Qs do not name Snowflake/leases as the answer (UUID Q names the rival, not the fix)
U17 real-world + at-scale      9/10    0.5  adv    Snowflake at Twitter-scale; worker-ID exhaustion at 1024 and NTP jumps
U19 common misconceptions      9/10    0.5  adv    central authority myth; roughly-ordered ≠ strict cross-node order
U20 first 30 seconds           9/10    1    gate   spoken: order bar + node count → bit layout → zero hops on hot path; HLD-gated
U21 in-scope coverage          9/10    2    gate   layout, skew, worker lease vs static, fail-closed, sequence cap — senior ID-gen facets present
R2 length ceiling              9/10    0.5  adv    under ceiling
R3 section-overlap             8/10    0.5  adv    DF restates the numbered strategy list rather than only the pick-criteria
R4 hub-shaped signal           9/10    0.5  adv    one mechanism (Snowflake-style generator)
R5 scenario-bank overweight    9/10    0.5  adv    ~12% bank
R6 reading-order coherence     9/10    0.5  adv    strategies → bit layout → worker ID → failures; DFs after options
R7 redundant-in-spirit         7/10    0.5  adv    “no per-request coordination” restated TLDR / architecture / 30s / bank; keep architecture+Deep-Dive
R8 out-of-scope teaching       9/10    1    gate   Raft/Paxos not taught; ZK is lease mechanics only
HL1 system thesis              9/10    1    gate   thesis explicit in TLDR (clock + pre-assigned identity, handle skew)
HL2 requirements & scope       9/10    1    gate   uniqueness cannot relax; latency>global order; security on worker-ID uniqueness + ID predictability
HL3 capacity estimation        9/10    1    gate   500M/86400≈5.8K, peak 25K, storage none, constraint = worker-ID space not QPS; R/W N/A is honest
HL4 high-level architecture    9/10    1    gate   component + generation sequence; coordination off the hot path is visible
HL5 data model & storage       8/10    1    gate   64-bit layout is the schema; no persistence (correct) but engine/placement not labeled as HL5
HL6 trade-off summary          9/10    2    gate   decision log; fail-closed vs uniqueness cost named
V1 numeric claim verification  9/10    2    gate   2^12=4096/ms; 2^10=1024 workers; 2^41 ms≈69.7y; 500M/86400≈5787/s
V2 diagram-text agreement      9/10    0.5  adv    startup-only lease and in-process generate match prose
V3 comparison table accuracy   9/10    0.5  adv    no rival matrix; HL6 rows match body (UUID size/sort, counter RTT)
V4 terminology precision       8/10    0.5  adv    “strict global order” used carefully; “uniqueness guaranteed” is absolute (correct for the NFR)
V5 capacity estimation sanity  9/10    0.5  adv    500M/day math and 4096/ms vs 25K peak both check
V6 trade-off summary accuracy  9/10    0.5  adv    HL6 Why cells follow Strategies / Worker ID / Reliability
V7 prerequisite necessity      7/10    1    gate   Consensus is a stretch-but-real (lease store); Sharding Strategies is adjacency not a Snowflake dep — BLOCKER
V8 assumptions (algorithms)    n/a     -    -      (not an Algorithm article)
V9 cross-article consistency   9/10    1    gate   vs cache/kv/url/youtube: Snowflake vs URL range-pool are different ID shapes (64-bit sortable vs short public codes), not a numeric clash
V10 at-scale + probe accuracy  9/10    0.5  adv    NTP backward jump and lease fail-closed answers are correct
CO1–CO4 / AL1–AL7 / DV1–DV4    n/a     -    -      (HLD article)
H1–H3 / P1–P3                  n/a     -    -      (not hub/path)
--------------------------------------------------------------------------------

GATE: NO-SHIP - 5 gated params below 9 (U4, U6, R1, V7, HL5).

BLOCKERS (gated, score ≤8 - fix before publish):
- U4: rewrite TLDR to ≤50 words; keep uniqueness-without-shared-counter + skew
- U6: table Counter vs UUID vs Snowflake on coordination / sortability / size / hot-path RTT
- R1: Strategies list should be the table; DF becomes “pick Snowflake when…” one liner + link; HL6 Why links back
- V7: drop `sharding-strategies.md` or replace with a real dep (e.g. clocks/NTP, or `../hld` none); keep consensus only if lease-store is framed as consensus
- HL5: label the 41/10/12 layout as the data model and state “no durable store; uniqueness is in the bit contract”

FIXES (ranked):
1. U4: ≤50-word TLDR
2. U6+R1: one comparison table for the three ID approaches; delete duplicated DF/HL6 restatement
3. V7: replace Sharding Strategies prereq with a genuine dep (or delete)
4. HL5: explicit “Data model” = bit layout; no LSM/B-tree needed
5. U12 (adv): `### Clock skew` H3 inside Snowflake Deep-Dive feeding the summary H2
6. R7: don’t restate zero-coordination in four voices — keep diagram + Deep-Dive

---

key-value-store.md  -  82/100  -  NO-SHIP   [type: HLD]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   simple API, hard engine+CAP choice; thesis in TLDR
U2 prerequisites format        9/10    1    gate   CH, replication, CAP, B+tree — name+tier; all concept deps
U3 TOC                         10/10   0.5  gate   matches H2s
U4 TLDR                        6/10    1    gate   87 words (limit ≤50) — BLOCKER
U5 diagrams                    9/10    1    gate   cluster ASCII + write-path quorum sequence
U6 tables                      9/10    1    gate   LSM vs B-Tree body table is the right shape (duplicate scored on R1)
U7 format spine                9/10    1    gate   spine + Trade-off before Appendices
U8 filename convention         10/10   0.5  gate   PASS - key-value-store.md: ok (sd-check.sh)
U9 links resolve               10/10   1    gate   PASS - all .md links resolve (sd-check.sh)
U10 soundbite                  8/10    0.5  adv    thesis speakable but over-limit TLDR
U11 callout usage              9/10    0.5  adv    engine DF, quorum Thought Process, compaction Gotcha, conflict DF
U12 failure modes two-level    6/10    1    adv    summary bullets; compaction Gotcha is not an H3 (cap 6)
U13 vendor examples            9/10    0.5  adv    Cassandra, RocksDB, LevelDB, Dynamo-style — no proprietary internals
R1 no duplicate content        2/10    3    gate   B-Tree vs LSM fully stated in Storage Engine table, DF, HL6 row, AND Appendix Selection Matrix — 3+ restatements cap 2 (2-line: weight-3)
U15 section length proportionality 8/10 2 gate   208 lines total OK, but LSM write-path/compaction restated across Engine + Deep-Dive + Failure Modes — BLOCKER
U16 consolidated interview lens 9/10   3    gate   3 lenses, one bank
U22 follow-up probe content    9/10    1    gate   compaction-behind detection, concurrent partition writes, hot-key detection
U23 Q/probe leak               9/10    1    gate   Qs do not name quorum formula / LSM / key-split as the answer
U17 real-world + at-scale      9/10    0.5  adv    Cassandra compaction_throughput / RocksDB rate limiter; compaction-behind as at-scale failure
U19 common misconceptions      9/10    0.5  adv    quorum ≠ linearizable; more replicas ≠ free durability
U20 first 30 seconds           9/10    1    gate   spoken: R/W + range/index need → engine + CAP; HLD-gated
U21 in-scope coverage          9/10    2    gate   engine, CH+RF, quorum, LWW/VC, hinted handoff, read repair, anti-entropy, compaction, hot key
R2 length ceiling              9/10    0.5  adv    under ceiling
R3 section-overlap             7/10    0.5  adv    Deep-Dive reopens LSM write path already explained in Storage Engine
R4 hub-shaped signal           9/10    0.5  adv    one KV system; LSM is HL5 engine choice not a second product
R5 scenario-bank overweight    9/10    0.5  adv    ~11% bank
R6 reading-order coherence     9/10    0.5  adv    engine → partition/repl → conflicts → compaction
R7 redundant-in-spirit         6/10    0.5  adv    compaction-behind told in Deep-Dive + Gotcha + Failure Modes + Scenario Q1
R8 out-of-scope teaching       9/10    1    gate   LSM depth is this page’s storage-engine+bottleneck (HL5/HL3), not a nested component article; CH intro+link
HL1 system thesis              9/10    1    gate   engine + CAP-forced consistency trade in TLDR
HL2 requirements & scope       9/10    1    gate   AP default with quorum knob; latency; security (mTLS/API keys, TLS, at-rest configurable)
HL3 capacity estimation        7/10    1    gate   order is Users(keys) not DAU; constraint (compaction I/O) named so not cap-5, but DAU step missing — BLOCKER
HL4 high-level architecture    9/10    1    gate   component + write quorum sequence; leaderless named
HL5 data model & storage       9/10    1    gate   LSM vs B-tree, CH+vnodes, RF=3 ring replicas
HL6 trade-off summary          9/10    2    gate   decision log; extra replica cost lives in misconceptions (acceptable)
V1 numeric claim verification  9/10    2    gate   200M×1KB×3=600GB; 30K×1KB=30MB/s; W+R>N statement correct as overlap not linearizability
V2 diagram-text agreement      9/10    0.5  adv    coordinator→N replicas wait W acks matches prose
V3 comparison table accuracy   8/10    0.5  adv    B-tree “best for read-heavy” vs choosing LSM at 10:1 is argued in DF, not a false cell
V4 terminology precision       9/10    0.5  adv    article itself blocks “strongly consistent” for quorum; good
V5 capacity estimation sanity  7/10    0.5  adv    storage/bw math OK; 30K QPS not derived from a DAU
V6 trade-off summary accuracy  9/10    0.5  adv    HL6 follows engine/partition/leaderless/quorum/conflict sections
V7 prerequisite necessity      9/10    1    gate   CH, replication, CAP, B+tree all used on-page
V8 assumptions (algorithms)    n/a     -    -      (not an Algorithm article)
V9 cross-article consistency   9/10    1    gate   vs cache: async-cache vs quorum-KV is workload-scoped; vs url: URL’s leader-follower mapping store ≠ this leaderless design; 1/N remap consistent with cache
V10 at-scale + probe accuracy  9/10    0.5  adv    compaction-behind is the real LSM incident pattern; probes correct
CO1–CO4 / AL1–AL7 / DV1–DV4    n/a     -    -      (HLD article)
H1–H3 / P1–P3                  n/a     -    -      (not hub/path)
--------------------------------------------------------------------------------

GATE: NO-SHIP - 4 gated params below 9 (R1, U4, U15, HL3).

BLOCKERS (gated, score ≤8 - fix before publish):
- R1: keep B-Tree vs LSM in the Storage Engine table only; delete Appendix Selection Matrix; HL6 Why = one sentence + `#storage-engine-lsm-tree-vs-b-tree` link
- U4: TLDR ≤50 words
- U15: Deep-Dive should start at the I/O-budget tension, not re-teach memtable→SSTable
- HL3: add DAU (or justify key-count as the user proxy) then derive 30K/3K QPS

FIXES (ranked):
1. R1: one LSM vs B-tree table; drop appendix matrix and DF restatement
2. U15: trim Deep-Dive + Failure Modes compaction bullets to link the Deep-Dive
3. U4: ≤50-word TLDR
4. HL3: DAU → QPS arithmetic
5. U12 (adv): `### Compaction stall` H3 inside Deep-Dive
6. R7: Scenario Q1 should not re-explain bloom filters / rate-limit compaction

---

url-shortener.md  -  81/100  -  NO-SHIP   [type: HLD]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   redirect is easy; collision-free codes without a shared bottleneck
U2 prerequisites format        9/10    1    gate   Databases / Caching / CH name+tier; format OK
U3 TOC                         10/10   0.5  gate   matches H2s
U4 TLDR                        6/10    1    gate   74 words (limit ≤50) — BLOCKER
U5 diagrams                    8/10    1    gate   split write/read ASCII + read sequence; write path not sequenced — BLOCKER
U6 tables                      7/10    1    gate   three generation approaches are a numbered list+DF, not a table — BLOCKER
U7 format spine                9/10    1    gate   spine intact
U8 filename convention         10/10   0.5  gate   PASS - url-shortener.md: ok (sd-check.sh)
U9 links resolve               10/10   1    gate   PASS - all .md links resolve (sd-check.sh)
U10 soundbite                  8/10    0.5  adv    thesis speakable, not marked, over-limit TLDR
U11 callout usage              9/10    0.5  adv    generation DF, 301/302 DF, Thought Process on moving coordination off hot path
U12 failure modes two-level    6/10    1    adv    summary bullets only; no inline H3s (cap 6)
U13 vendor examples            7/10    0.5  adv    DynamoDB/Cassandra as storage; no named shortener (Bitly-class) as U17/U13 workhorse
R1 no duplicate content        5/10    3    gate   generation trade fully in Short-Code Generation + Deep-Dive + HL6 row — cap 5 (2-line: weight-3)
U15 section length proportionality 8/10 2 gate   Deep-Dive restates key-pool vs auto-increment already in Short-Code Generation — BLOCKER
U16 consolidated interview lens 9/10   3    gate   3 lenses, one bank
U22 follow-up probe content    9/10    1    gate   overlapping ranges, viral link, custom alias vs pool — distinct follow-ups
U23 Q/probe leak               8/10    1    gate   Q3 names sequential auto-increment vs random (gives the rejected mechanism); single leak = NOTE, still <9 — BLOCKER
U17 real-world + at-scale      7/10    0.5  adv    “most production shorteners” unnamed; viral-link/hot-partition is the at-scale claim
U19 common misconceptions      9/10    0.5  adv    “just a DB+redirect”; 301-is-always-better
U20 first 30 seconds           9/10    1    gate   spoken R/W + aliases → generation bottleneck; HLD-gated
U21 in-scope coverage          7/10    2    gate   thesis is decentralized unique IDs but no intro+link to `./distributed-id-generator.md`; custom alias/302/click-batch present — BLOCKER
R2 length ceiling              9/10    0.5  adv    under ceiling
R3 section-overlap             5/10    0.5  adv    Deep-Dive opens by redefining the auto-increment failure already in Short-Code Generation
R4 hub-shaped signal           9/10    0.5  adv    one product (shortener); cache/CH intro+link
R5 scenario-bank overweight    9/10    0.5  adv    ~12% bank
R6 reading-order coherence     8/10    0.5  adv    301/302 DF before reliability is fine; generation vs Deep-Dive is the bump
R7 redundant-in-spirit         6/10    0.5  adv    key-pool story in Generation + Deep-Dive + 30s + Q1
R8 out-of-scope teaching       8/10    1    gate   range-allocation/ZK uniqueness is sibling-shaped vs `distributed-id-generator.md` (Snowflake is different encoding, but uniqueness-off-hot-path is taught at full depth here) — BLOCKER
HL1 system thesis              9/10    1    gate   thesis in TLDR
HL2 requirements & scope       9/10    1    gate   AP for redirects; 302 vs analytics; security (non-enumerable codes, rate-limit, scheme sanitization)
HL3 capacity estimation        9/10    1    gate   100M/mo → ~40/s writes; 100:1 reads; 50GB/mo; constraint = cache hit ratio
HL4 high-level architecture    8/10    1    gate   read sequence present; write/generation path not a sequence — BLOCKER
HL5 data model & storage       9/10    1    gate   url_mappings schema, KV vs SQL, shard by short_code
HL6 trade-off summary          8/10    2    gate   table exists (not prose-only) but Why cells restate Generation/Redirect DFs; cost (CDN/egress) unnamed where cache-vs-origin is the constraint — BLOCKER
V1 numeric claim verification  8/10    2    gate   1e8/(30×86400)≈38.6/s ≈40/s; 50GB/mo; 7.5MB/s OK; md5[:7] collision-check claim OK, slightly underspecified
V2 diagram-text agreement      8/10    0.5  adv    cache-then-DB matches sequence; write diagram omits key-pool component the prose centers
V3 comparison table accuracy   9/10    0.5  adv    no appendix matrix; HL6 rows match body (302 vs tracking, KV vs lookup)
V4 terminology precision       8/10    0.5  adv    “leader-follower” for a store also named as DynamoDB/Cassandra is loose (those are not classic L-F)
V5 capacity estimation sanity  9/10    0.5  adv    month→QPS and storage arithmetic hold
V6 trade-off summary accuracy  9/10    0.5  adv    Why cells follow body (even where they duplicate)
V7 prerequisite necessity      9/10    1    gate   DB + cache + CH all used; missing ID-gen sibling is U21 not V7
V8 assumptions (algorithms)    n/a     -    -      (not an Algorithm article)
V9 cross-article consistency   9/10    1    gate   vs id-gen: Snowflake vs range-pool are different public-ID shapes; vs kv: leaderless KV article vs this mapping store’s L-F is composition not a numeric contradiction; vs cache hot-key — aligned (links `./distributed-cache.md`)
V10 at-scale + probe accuracy  9/10    0.5  adv    viral short-link / key-pool exhaustion / custom-alias collision are real; probes correct
CO1–CO4 / AL1–AL7 / DV1–DV4    n/a     -    -      (HLD article)
H1–H3 / P1–P3                  n/a     -    -      (not hub/path)
--------------------------------------------------------------------------------

GATE: NO-SHIP - 11 gated params below 9 (R1, U21, U4, U6, U15, V1, U5, U23, R8, HL4, HL6).

BLOCKERS (gated, score ≤8 - fix before publish):
- R1: keep generation comparison in Short-Code Generation only; Deep-Dive should add enumeration/ops, not re-list the three approaches; HL6 links back
- U21: 2–3 sentence intro + link to `./distributed-id-generator.md` for uniqueness-without-coordination; keep base62/custom-alias/302 on this page
- U4: TLDR ≤50 words
- U6: table Hash vs random+retry vs key-pool
- U15: Deep-Dive must not re-teach auto-increment; start at range-lease + guessability
- V1: pin hash length / keyspace math if [:7] stays; otherwise drop the md5 example precision
- U5/HL4: add a write/generation sequence (API → pool pop → DB put)
- U23: rewrite Q3 so it does not name auto-increment/sequential as the answer key (“how would an attacker enumerate unlisted links?”)
- R8: uniqueness-off-hot-path = intro+link to id-gen; this page keeps short-code encoding, 301/302, click-batch, custom alias
- HL6: Why cells = one new sentence or a link; mention cache/CDN $ if that is why origin isn’t the read path

FIXES (ranked):
1. R1: one generation comparison; Deep-Dive = incremental (enumeration, range lease, pool monitoring)
2. U21+R8: intro+link `distributed-id-generator.md`; stop teaching ZK disjoint IDs at scenario-bank depth
3. U4: ≤50-word TLDR
4. U6: generation as a table
5. U15: trim Deep-Dive overlap
6. HL6: decision log with links, not DF reprints
7. U5/HL4: write-path sequence including key pool
8. U23: de-leak Q3
9. V1: either derive 62^7 or drop `[:7]`
10. U13/U17 (adv): name one real shortener as the workhorse

---

youtube-video-streaming.md  -  19/100  -  NO-SHIP   [type: HLD]

Kind: **specific HLD** (no Hub marker; not cheatsheet/path). File is a one-line stub: `# Design: Youtube Video Streaming`.

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   0/10    1    gate   missing — BLOCKER
U2 prerequisites format        0/10    1    gate   no Prerequisites section — BLOCKER
U3 TOC                         0/10    0.5  gate   missing — BLOCKER
U4 TLDR                        0/10    1    gate   missing — BLOCKER
U5 diagrams                    0/10    1    gate   none (placeholder cap ≤2) — BLOCKER
U6 tables                      0/10    1    gate   none — BLOCKER
U7 format spine                0/10    1    gate   H1 only; no Prereqs/TOC/TLDR/body — BLOCKER
U8 filename convention         10/10   0.5  gate   PASS - youtube-video-streaming.md: ok (sd-check.sh)
U9 links resolve               10/10   1    gate   PASS - all .md links resolve (no links)
U10 soundbite                  0/10    0.5  adv    missing
U11 callout usage              0/10    0.5  adv    none
U12 failure modes two-level    0/10    1    adv    missing
U13 vendor examples            0/10    0.5  adv    missing
R1 no duplicate content        10/10   3    gate   no comparisons present to duplicate
U15 section length proportionality 0/10 2 gate   empty vs any HLD depth — BLOCKER
U16 consolidated interview lens 0/10   3    gate   no Scenario Bank — BLOCKER
U22 follow-up probe content    0/10    1    gate   no bank — BLOCKER
U23 Q/probe leak               0/10    1    gate   no entries (cannot show non-leak) — BLOCKER
U17 real-world + at-scale      0/10    0.5  adv    missing
U19 common misconceptions      0/10    0.5  adv    missing
U20 first 30 seconds           0/10    1    gate   missing; HLD-gated — BLOCKER
U21 in-scope coverage          0/10    2    gate   no composition/capacity/trade-offs — BLOCKER
R2 length ceiling              9/10    0.5  adv    1 line, not over ceiling
R3 section-overlap             0/10    0.5  adv    no sections to layer
R4 hub-shaped signal           9/10    0.5  adv    not hub-shaped; it is an empty specific stub
R5 scenario-bank overweight    9/10    0.5  adv    no bank to overweight
R6 reading-order coherence     0/10    0.5  adv    no body
R7 redundant-in-spirit         10/10   0.5  adv    nothing restated
R8 out-of-scope teaching       10/10   1    gate   teaches no sibling
HL1 system thesis              0/10    1    gate   missing — BLOCKER
HL2 requirements & scope       0/10    1    gate   missing — BLOCKER
HL3 capacity estimation        0/10    1    gate   missing — BLOCKER
HL4 high-level architecture    0/10    1    gate   missing — BLOCKER
HL5 data model & storage       0/10    1    gate   missing — BLOCKER
HL6 trade-off summary          0/10    2    gate   missing (not a prose-only table; absent) — BLOCKER
V1 numeric claim verification  0/10    2    gate   no claims to verify; required HLD numerics absent — BLOCKER
V2 diagram-text agreement      0/10    0.5  adv    no diagram
V3 comparison table accuracy   0/10    0.5  adv    no tables
V4 terminology precision       0/10    0.5  adv    no terms used
V5 capacity estimation sanity  0/10    0.5  adv    no HL3 to re-derive
V6 trade-off summary accuracy  0/10    0.5  adv    no HL6
V7 prerequisite necessity      0/10    1    gate   no prereqs — BLOCKER
V8 assumptions (algorithms)    n/a     -    -      (not an Algorithm article)
V9 cross-article consistency   9/10    1    gate   stub asserts nothing; compared to cache/id-gen/kv/url claims — no contradiction possible
V10 at-scale + probe accuracy  0/10    0.5  adv    no U17/U22 content
CO1–CO4 / AL1–AL7 / DV1–DV4    n/a     -    -      (HLD article)
H1–H3 / P1–P3                  n/a     -    -      (not hub/path)
--------------------------------------------------------------------------------

GATE: NO-SHIP - stub missing every gated HLD/universal param except U8/U9/R1/R8/V9.

BLOCKERS (gated, score ≤8 - fix before publish):
- Write the article (HL1–HL6, U1–U7, U16/U20/U22/U23, capacity, architecture, trade-off log). This is not a trim; it is an unwritten page.

FIXES (ranked):
1. Author a full HLD specific article (upload, transcode, CDN, adaptive bitrate, thumbnails/metadata) with intro+link to cache/CDN/queue siblings — do not expand this stub in-place without the writer pass (rater does not write)

---
