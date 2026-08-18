# SD Algorithms Content Audit (wiki-fe)

**Date:** 2026-08-18
**Scope:** `content/system-design/algorithms/*.md` (11 articles)
**Rubric:** `docs/_meta/ai-instructions/sd-rater.md` + `sd-writer.md` (publish gate: gated param ≤8 → NO-SHIP)
**Mode:** read-only critique; no content edits in this pass

## Executive summary

- **SHIP:** 11 / 11
- **NO-SHIP:** 0 / 11
- **Hub/cheatsheet/path articles:** none in this category — all 11 scored as specific Algorithm/Concept articles
- **Unfilled-skeleton stubs found:** none
- **Mean score (all):** 92.5/100
- **Mean score (SHIP only):** 92.5/100 (same, no NO-SHIP articles to exclude)

### Scoreboard

| Article | Score | Gate | Kind |
|---|---:|---|---|
| `acid-vs-base.md` | 93/100 | **SHIP** | specific |
| `cap-theorem.md` | 93/100 | **SHIP** | specific |
| `circuit-breaker.md` | 91/100 | **SHIP** | specific |
| `consensus-raft-paxos.md` | 90/100 | **SHIP** | specific |
| `consistency-models.md` | 93/100 | **SHIP** | specific |
| `consistent-hashing.md` | 88/100 | **SHIP** | specific |
| `idempotency.md` | 94/100 | **SHIP** | specific |
| `rate-limiting-algorithms.md` | 95/100 | **SHIP** | specific |
| `replication-strategies.md` | 96/100 | **SHIP** | specific |
| `saga-pattern.md` | 96/100 | **SHIP** | specific |
| `sharding-strategies.md` | 96/100 | **SHIP** | specific |

### SHIP list

- `acid-vs-base.md` — 93/100
- `cap-theorem.md` — 93/100
- `circuit-breaker.md` — 91/100
- `consensus-raft-paxos.md` — 90/100
- `consistency-models.md` — 93/100
- `consistent-hashing.md` — 88/100
- `idempotency.md` — 94/100
- `rate-limiting-algorithms.md` — 95/100
- `replication-strategies.md` — 96/100
- `saga-pattern.md` — 96/100
- `sharding-strategies.md` — 96/100

## Systemic findings (P0 → P3)

### P0 — Unpublishable / empty inventory

None. All 11 articles are complete, real content — no skeleton/template residue.

### P1 — Recurring gate failures on otherwise strong articles

1. **`consistent-hashing.md`'s only [Must read] prerequisite (`Hash Functions`) points to a not-yet-written page** — a spec-compliant `<!-- link: ./hash-functions.md -->` placeholder, not a broken link, but functionally unreachable for a reader right now. This dragged U2 and V7 to 7/10 each, the only gated-param sub-9 scores tied to content the article itself can't fix (the fix is writing `hash-functions.md`, not editing this article).
2. **`consensus-raft-paxos.md`'s U21 (in-scope coverage) landed at 8/10** — the read-index/lease-based-read mechanism (how a follower-routed or stale-leader read avoids serving stale data under Raft/Paxos) gets only a one-clause treatment inside the Split-Brain subsection, thin relative to how often it's the natural follow-up question once split-brain comes up. Not severe enough to be a true coverage hole, but the single weakest senior facet found across the whole batch.

### P2 — Portfolio gaps (advisory but systemic)

1. **U10 (interview soundbite) is the most consistently dinged advisory param** — 8/10 on `circuit-breaker.md`, `consensus-raft-paxos.md`, `consistent-hashing.md` (3 of 11). Each has a strong Mental Model analogy but no distinct standalone closing soundbite line separate from that analogy/TLDR. `acid-vs-base.md` and `consistency-models.md` do this well via repeated "Key Takeaway" lines — worth propagating that pattern to the other 9.
2. **U12 (two-level failure-modes pattern) is inconsistently applied** — `idempotency.md` and `rate-limiting-algorithms.md` score 8/10 for having only a consolidated Gotchas section with no inline H3 counterparts elsewhere in the body; the other articles that use U12 show genuine two-layer treatment. Given both articles are on the lean/short side (131 and 246 lines), this may be proportionate rather than a real gap — flagged for awareness, not necessarily action.
3. **U20 (First 30 seconds framing script) is unwritten on most of the batch** — correctly advisory (not gated) for Algorithm-section articles per the conditional-gate rule, but only `acid-vs-base.md` has one. A cheap, optional polish item if a future pass wants to standardize it across the folder.

### P3 — Coverage / polish

1. **`circuit-breaker.md`'s U23 near-miss**: the breaker-storm Scenario Bank question ("What's a breaker storm, and how would you prevent one?") borders on defining its own answer's term in the question stem, rather than describing a scenario for the candidate to diagnose. Single instance — doesn't cap per the rubric's 2+-instance rule, but worth rewording on a future touch.
2. **`cap-theorem.md`'s U17 at-scale claim is diffuse** — the specific "breaks past X" framing is spread across the CA-myth and Real-World Applications sections rather than stated as one explicit sentence; still scored 9/10 (present, just not maximally tight).
3. **`consistency-models.md`'s AL7 (formal properties) is thinner than its sibling articles'** — no explicit latency-order-of-magnitude number the way `acid-vs-base.md` and `cap-theorem.md` provide for their own AL7-equivalent rows; scored 8/10, the article's only sub-9.

## Content-backlog candidates

| Priority | Article | Fix type | Blocker summary |
|---|---|---|---|
| P1 | `hash-functions.md` (does not exist) | new-article | `consistent-hashing.md`'s sole [Must read] prerequisite is a stub link with no target; write the article so the prerequisite resolves |
| P2 | `consensus-raft-paxos.md` | add-section | Expand the read-index/lease-based-read mechanism from one clause into 2-3 standalone sentences (U21, weight 2) |
| P3 | `circuit-breaker.md` | hygiene | Reword the breaker-storm Scenario Bank Q from a define-the-term form into a diagnose-the-scenario form (U23) |
| P3 | `circuit-breaker.md`, `consensus-raft-paxos.md`, `consistent-hashing.md` | hygiene | Add a standalone Key-Takeaway/soundbite line distinct from the TLDR/Mental-Model paragraph (U10) |
| P3 | `cap-theorem.md` | hygiene | Consolidate the at-scale failure claim (currently split across CA-myth and Real-World sections) into one explicit sentence (U17) |
| P3 | `consistency-models.md` | hygiene | Add one concrete latency-order-of-magnitude comparison to AL7, matching the depth `acid-vs-base.md`/`cap-theorem.md` give their own numeric row |

## Portfolio signals (pre-rate)

- Stub markers found: none
- Hub markers found: none (all 11 are specific articles)
- `sd-check.sh` (U8 filename convention / U9 links resolve): PASS on all 11, no filesystem issues
- Length: all 11 well under the ~400-700 line soft ceiling (131-658 lines; `cap-theorem.md` at 658 is the longest but organized into 12 proportionate H2 sections, no restatement bloat found)
- V9 cross-article consistency: full exhaustive pass across all 11 siblings, both chunks cross-checked against the whole folder — **zero contradictions found**. Minor phrasing variance noted and correctly not flagged as a conflict: Spanner global-transaction latency stated as "tens of ms" in `acid-vs-base.md` vs "10-100ms" in `cap-theorem.md` — same order of magnitude, different precision, not a contradiction.

## Per-article ratings

### `acid-vs-base.md` — 93/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   bank-teller vs self-checkout kiosk analogy, direct + precise
U2 prerequisites format        9/10    1    gate   CAP [Must read], Consistency Models + Replication [Should read] - all genuine deps
U3 TOC                         10/10   0.5  adv    flat list matches headings
U4 TLDR                        9/10    1    gate   self-contained, states core trade-off, flashcard-passable
U5 diagrams                    9/10    1    gate   ASCII sequence diagrams for ACID and BASE write paths, match prose exactly
U6 tables                      9/10    1    adv    isolation levels table, real-world table, Selection Matrix all proper tables
U7 format spine                10/10   1    gate   Title→Prereq→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  9/10    0.5  adv    "Key Takeaway" lines throughout function as soundbites; strong compression
U11 callouts                   9/10    0.5  adv    Thought Process/Decision Framework/Warning used correctly, non-obvious only
U12 failure modes              n/a     -    gate   algorithm article - uses "Common Misapplications & Gotchas" per algo spine, not Component's two-level pattern
U13 vendor examples            9/10    1    adv    PostgreSQL/MySQL/Spanner/Cassandra/DynamoDB/CouchDB with concrete "why" per system
U14/R1 no duplicate content    9/10    3    gate   ACID's C vs CAP's C explained once here, links out to cap-theorem.md rather than restating
U15 section length proportionality 9/10 2  gate   365 lines total, each H2 well under 250-line soft cap, no restatement bloat
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank near end, 4 entries, no stray per-H2 lens blocks
U17 real-world + at-scale      9/10    0.5  adv    Cassandra tombstone/gc_grace_seconds at-scale failure named with real threshold and mechanism
U19 misconceptions             9/10    0.5  adv    3 solid bullets, all wrong-mental-model type, not gotchas-in-disguise
U20 first 30 seconds           9/10    0.5  adv    present, genuinely spoken-aloud framing, not a recap (advisory for Algorithm)
U21 in-scope coverage          9/10    2    gate   covers definition, mechanics, isolation levels, when-to-use, at-scale failure; no missing senior facet found
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine follow-ups distinct from their Q, not reworded dupes
U23 Q/probe leak               9/10    1    gate   no Q or Next-question names its own answer's mechanism
AL1 analogy                    9/10    0.5  adv    bank teller / self-checkout kiosk, maps to the actual trade-off not just the label
AL2 formal definition          9/10    1    gate   4 ACID properties + BASE's 3-part posture, plain English, concise
AL3 proof sketch               n/a     -    adv    correctly skipped - design-posture topic, not a theorem needing a proof sketch
AL4 assumptions                n/a     -    adv    correctly not forced - design posture pair, not a formal theorem with its own boundary conditions
AL5 often confused with        10/10   1    gate   ACID's C vs CAP's C, ACID vs BASE≠correct/incorrect, ACID vs isolation levels - all 3 well disambiguated
AL6 variants & extensions      9/10    1    gate   isolation-level spectrum table + BASE extensions (read-your-writes, bounded staleness, tunable consistency)
AL7 complexity & formal properties 8/10 1  gate   latency/throughput cost named clearly but no formal error-bound/space-complexity numbers
V1 numeric claim verification  9/10    2    gate   WAL fsync low-single-digit ms, 2PC/consensus tens of ms - both plausible orders of magnitude
V4 terminology precision       9/10    0.5  adv    ACID's C vs CAP's C kept rigorously separate throughout; no loose "consistent" usage found
V7 prerequisite necessity      9/10    1    gate   CAP Theorem genuinely load-bearing; Consistency Models and Replication both genuinely needed for BASE mechanics
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - Spanner latency same order of magnitude as cap-theorem.md; ACID's C/CAP's C definitions match cap-theorem.md and consistency-models.md exactly; no contradictions found
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9.

FIXES (minor polish only):
1. AL7: could add one formal-properties data point (e.g. rough throughput ceiling for Serializable vs Read Committed) to push from 8→9, not required to ship.
```

### `cap-theorem.md` — 93/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   bank-branch-during-outage analogy, precise and memorable
U2 prerequisites format        9/10    1    gate   Consistency Models [Must read], Replication [Should read] - genuine deps
U3 TOC                         10/10   0.5  adv    flat list matches all headings
U4 TLDR                        9/10    1    gate   self-contained, states forced C-vs-A choice, flashcard-passable
U5 diagrams                    9/10    1    gate   Venn-style CAP triangle + partition-scenario ASCII diagram, match prose
U6 tables                      9/10    1    adv    Selection Matrix, PACELC table, CP/AP systems tables, CAP's C vs ACID's C table
U7 format spine                10/10   1    gate   correct spine, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  9/10    0.5  adv    "P is always chosen by default... the meaningful decision is C vs A" - strong compression
U11 callouts                   9/10    0.5  adv    Thought Process/Decision Framework/Warning all non-obvious, no filler use
U12 failure modes              n/a     -    gate   algorithm article, uses Common Misapplications & Gotchas per spine
U13 vendor examples            9/10    1    adv    ZooKeeper/etcd/HBase/Spanner (CP), Cassandra/DynamoDB/DNS/CouchDB (AP), each with concrete "why"
U14/R1 no duplicate content    9/10    3    gate   CAP's C vs ACID's C stated once, acid-vs-base.md correctly links back rather than restating
U15 section length proportionality 9/10 2  gate   658 lines but 12 well-organized H2 sections, each proportionate to its conceptual weight
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 5 entries, no per-H2 lens blocks scattered elsewhere
U17 real-world + at-scale      9/10    0.5  adv    folded into Real-World Applications; at-scale note slightly diffuse across CA-myth and real-world sections
U19 misconceptions             9/10    0.5  adv    5 well-formed wrong-mental-model bullets
U20 first 30 seconds           n/a     -    adv    not present as distinct opening script; advisory for Algorithm, minor ding not a blocker
U21 in-scope coverage          9/10    2    gate   theorem, proof sketch, assumptions, CP/AP mechanics, PACELC, Harvest/Yield, real-world all covered
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine design-choice follow-ups, not restatements
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-names its answer's mechanism
AL1 analogy                    9/10    0.5  adv    bank branch during outage, maps directly to CP/AP trade-off
AL2 formal definition          9/10    1    gate   Gilbert-Lynch formalization stated plainly, concise
AL3 proof sketch               9/10    0.5  adv    genuinely illuminates the design insight (N2 can't distinguish lost-vs-delayed write), correctly included
AL4 assumptions                9/10    1    gate   asynchronous network model + binary property framing, both the theorem's actual boundary conditions
AL5 often confused with        10/10   1    gate   CAP's C vs ACID's C + CAP vs PACELC, both distinct and well-disambiguated with a table
AL6 variants & extensions      9/10    1    gate   PACELC (with table) and Harvest/Yield, both distinct-design-implication variants
AL7 complexity & formal properties n/a  -    adv   n/a - CAP is a binary impossibility result, not an algorithm with time/space/error-bound complexity
V1 numeric claim verification  9/10    2    gate   Spanner 10-100ms global transaction latency plausible for TrueTime commit-wait plus cross-region RPC
V4 terminology precision       9/10    0.5  adv    CAP's C vs ACID's C rigorously kept separate; "availability" vs SRE-HA explicitly disambiguated
V7 prerequisite necessity      9/10    1    gate   Consistency Models genuine (linearizability used throughout); Replication Strategies genuinely informs quorum/leader mechanics
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - Spanner "10-100ms" here vs acid-vs-base.md's "tens of ms" same order of magnitude, not a contradiction; no contradicting claims found
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9.

FIXES (minor polish only):
1. U17: tighten the at-scale failure claim into one explicit sentence - not required to ship.
2. U20 (advisory): consider adding an explicit "First 30 seconds" framing blockquote before Interview Scenario Bank.
```

### `circuit-breaker.md` — 91/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   electrical breaker analogy, clean "safety valve not retry" framing
U2 prerequisites format        9/10    1    gate   Idempotency [Must read], Load Balancer [Should read] - both genuine
U3 TOC                         9/10    0.5  adv    flat list matches headings
U4 TLDR                        9/10    1    gate   self-contained, names 3 states + Hystrix + breaker-storm at-scale failure in one TLDR
U5 diagrams                    9/10    1    gate   ASCII state-machine diagram matches the 3-state prose exactly
U6 tables                      9/10    1    adv    Failure Detection Strategies table, Configuration Parameters table, both genuine comparisons
U7 format spine                9/10    1    gate   Title→Prereq→TOC→TLDR→body→Appendices, correct
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  8/10    0.5  adv    TLDR ends strong but no single distinct standalone soundbite line
U11 callouts                   9/10    0.5  adv    Warning/Gotcha, Thought Process, Decision Framework all genuinely non-obvious
U12 failure modes              n/a     -    gate   algorithm article, uses Common Misapplications & Gotchas per spine
U13 vendor examples            9/10    1    adv    Hystrix (reference impl, maintenance mode) and resilience4j/service-mesh named with real context
U14/R1 no duplicate content    9/10    3    gate   retries/timeouts/bulkheads distinction stated once in Often Confused With, not repeated elsewhere
U15 section length proportionality 9/10 2  gate   216 lines total, well under soft ceiling, no section restates another
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered per-H2 lens blocks
U17 real-world + at-scale      9/10    0.5  adv    breaker storms at-scale failure named with concrete mechanism in both TLDR and When To Use
U19 misconceptions             9/10    0.5  adv    2 solid bullets, both genuine wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not present; advisory for Algorithm, acceptable
U21 in-scope coverage          9/10    2    gate   states, transitions, failure detection, config, fallback, observability, breaker-storms all covered
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine design-choice follow-ups
U23 Q/probe leak               8/10    1    gate   breaker-storm Q borders on naming its own topic in the question stem; single instance, NOTE-level not blocker
V1 numeric claim verification  9/10    2    gate   reset timeout 5-60s, min request volume ~20, all plausible against known Hystrix/resilience4j defaults
V4 terminology precision       9/10    0.5  adv    "failure" vs "slow-but-successful" kept precise throughout
V7 prerequisite necessity      9/10    1    gate   Idempotency genuinely load-bearing (retry-safety reasoning); Load Balancer fair should-read
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - no numeric or definitional contradictions; correctly cross-references idempotency.md's retry-safety framing without restating
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9 except U23 at 8, NOTE-level single-instance flag per the cap rule (needs 2+ to block).

FIXES (ranked):
1. U23 (weight 1): reword the breaker-storm Q into a scenario form the candidate diagnoses rather than defines.
2. U10 (weight 0.5): add one explicit soundbite/Key-Takeaway line distinct from the TLDR.
```

### `consensus-raft-paxos.md` — 90/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   jury/overlapping-majority analogy, precise and maps to the actual safety mechanism
U2 prerequisites format        9/10    1    gate   Replication Strategies [Must read], CAP Theorem [Should read] - both genuine
U3 TOC                         9/10    0.5  adv    flat list matches headings
U4 TLDR                        9/10    1    gate   self-contained, states quorum-overlap insight + Raft/Paxos trade-off + the partition trap
U5 diagrams                    9/10    1    gate   Paxos sequence diagram + Raft state-machine diagram, both match prose exactly
U6 tables                      9/10    1    adv    Paxos vs Raft table is a genuine multi-dimension comparison
U7 format spine                9/10    1    gate   correct spine, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  8/10    0.5  adv    TLDR's "overlapping majorities can never disagree" strong but not restated standalone
U11 callouts                   9/10    0.5  adv    Thought Process/Decision Framework at genuinely non-obvious points
U12 failure modes              n/a     -    gate   algorithm article, uses Common Misapplications & Gotchas per spine
U13 vendor examples            9/10    1    adv    etcd/Consul/CockroachDB/Kafka-KRaft/ZooKeeper-ZAB, each with concrete context
U14/R1 no duplicate content    9/10    3    gate   quorum-overlap safety argument explained once in Paxos section, Raft section correctly references not re-derives
U15 section length proportionality 9/10 2  gate   241 lines, Paxos and Raft sections proportionate to real complexity, no restatement bloat
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered lens blocks
U17 real-world + at-scale      9/10    0.5  adv    CockroachDB per-range Raft groups at-scale failure named with concrete mechanism
U19 misconceptions             9/10    0.5  adv    3 solid bullets, all wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not present; advisory for Algorithm, acceptable
U21 in-scope coverage          8/10    2    gate   strong Paxos/Raft coverage, BFT correctly intro+linked; read-index/lease-based-read pattern gets only glancing one-line treatment - thinnest senior facet found in the batch, not quite a full hole
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine follow-ups
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-names its own answer's mechanism
AL1 analogy                    9/10    0.5  adv    jury/majority-overlap analogy maps directly to the safety property
AL2 formal definition          9/10    1    gate   safety+liveness+agreement/validity/termination stated plainly and concisely
AL3 proof sketch               9/10    0.5  adv    "why majority quorums guarantee safety" genuinely illuminates the design insight
AL4 assumptions                9/10    1    gate   majority-reachable, crash-not-Byzantine, eventual delivery, persistent state - genuine boundary conditions
AL5 often confused with        9/10    1    gate   consensus vs replication, consensus vs 2PC - both genuinely distinct and useful
AL6 variants & extensions      9/10    1    gate   Multi-Paxos, Raft joint consensus, BFT - all distinct, BFT correctly scoped out with reasoning
AL7 complexity & formal properties 9/10 1  gate   2f+1 fault tolerance, majority-round-trip latency bound, "why 3 or 5 not more" - concrete
V1 numeric claim verification  9/10    2    gate   150-300ms Raft election timeout range and 2f+1/3f+1 formulas checked against known values - correct
V4 terminology precision       9/10    0.5  adv    "consensus" vs "replication" vs "2PC" kept precise; split-brain vs stale-leader-read correctly distinguished
V7 prerequisite necessity      9/10    1    gate   Replication Strategies genuinely load-bearing; CAP Theorem fair should-read
V8 assumptions accuracy        9/10    0.5  adv    stated assumptions are the real boundary conditions of Raft/Paxos, not a restatement of the definition
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - quorum/majority-overlap reasoning matches replication-strategies.md's W+R>N treatment exactly; no contradictions found
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9 except U21 at 8.

BLOCKERS (gated, score ≤8):
- U21: read-index/lease-based-read mechanism (currently one clause inside Split-Brain subsection) deserves standalone treatment given it's the single most commonly-probed follow-up to "does consensus prevent split-brain".

FIXES (ranked):
1. U21 (weight 2): expand the read-index/lease-based-read mechanism from one clause into 2-3 sentences of its own.
2. U10 (weight 0.5): add a standalone Key-Takeaway soundbite distinct from the TLDR.
```

### `consistency-models.md` — 93/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   "dial not a switch" framing, precise, distinguishes from CAP's binary framing
U2 prerequisites format        9/10    1    gate   Replication Strategies [Should read] - genuine, arguably could be [Must read]
U3 TOC                         10/10   0.5  adv    flat list matches headings
U4 TLDR                        9/10    1    gate   self-contained, names the spectrum + CAP's-C-collapses-into-two-extremes insight
U5 diagrams                    9/10    1    gate   ASCII spectrum diagram matches prose ordering exactly
U6 tables                      9/10    1    adv    Selection Matrix and real-world table both genuine multi-dimension comparisons
U7 format spine                10/10   1    gate   correct spine, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  9/10    0.5  adv    "naming the specific model... separates a precise answer from a hand-wave" - strong, repeated with variation
U11 callouts                   9/10    0.5  adv    Warning/Gotcha and Decision Framework at genuinely non-obvious points
U12 failure modes              n/a     -    gate   algorithm article, uses Common Misapplications & Gotchas per spine
U13 vendor examples            9/10    1    adv    Spanner/etcd/DynamoDB/Cassandra/Google Docs/Redis, each with concrete base-plus-layered-guarantee framing
U14/R1 no duplicate content    9/10    3    gate   spectrum stated once in dedicated section; Core Mechanics builds on it rather than re-explaining
U15 section length proportionality 9/10 2  gate   324 lines, sections proportionate, no restatement bloat
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 4 entries, no scattered lens blocks
U17 real-world + at-scale      9/10    0.5  adv    folded into Real-World Applications table + prose
U19 misconceptions             9/10    0.5  adv    3 solid bullets, all wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not present as distinct opening script; advisory for Algorithm, acceptable
U21 in-scope coverage          9/10    2    gate   spectrum, mechanics for both strong and weak ends, client-centric guarantees, real-world layering all covered
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine design-choice follow-ups
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-names its own answer's mechanism
AL1 analogy                    9/10    0.5  adv    group-chat-across-phones analogy, maps directly to the ordering/staleness question
AL2 formal definition          9/10    1    gate   each model's formal definition stated plainly and concisely
AL3 proof sketch               n/a     -    adv    correctly skipped - taxonomy/spectrum article, not a single theorem
AL4 assumptions                n/a     -    adv    correctly not forced - taxonomy of guarantees, not a single formal result
AL5 often confused with        10/10   1    gate   consistency models vs CAP's C vs ACID's C (3-way) + strong-vs-eventual false binary
AL6 variants & extensions      n/a     -    gate   article body IS the variant spectrum, correctly not duplicated as a separate section
AL7 complexity & formal properties 8/10 1  gate   coordination-cost tradeoffs named clearly but no explicit latency-order-of-magnitude numbers like sibling articles provide
V1 numeric claim verification  9/10    2    gate   no aggressive numeric claims to mis-verify; convergence range appropriately hedged
V4 terminology precision       10/10   0.5  adv    this article IS the terminology-precision reference page for the whole folder
V7 prerequisite necessity      9/10    1    gate   Replication Strategies genuinely load-bearing for Core Mechanics' quorum/leader-routing discussion
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - CAP's C, ACID's C definitions match cap-theorem.md and acid-vs-base.md exactly; no contradictions found
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9.

FIXES (minor polish only):
1. AL7 (weight 1): add one concrete latency-order-of-magnitude comparison to match sibling articles' depth.
2. U2 (weight 1): consider whether Replication Strategies should be [Must read] rather than [Should read] - not a blocker, tier-accuracy nit.
```

### `consistent-hashing.md` — 88/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   circular-parking-lot analogy, precise ("stable under bucket count changing")
U2 prerequisites format        7/10    1    gate   Hash Functions [Must read] links to a not-yet-written page via spec-compliant placeholder - content-backlog debt, not a format defect
U3 TOC                         9/10    0.5  adv    flat list matches headings
U4 TLDR                        9/10    1    gate   self-contained, states ~1/N vs (N-1)/N and virtual-node fix in one TLDR
U5 diagrams                    9/10    1    gate   ring ASCII diagram + virtual-node-positions illustration, match prose exactly
U6 tables                      9/10    1    adv    Rebalancing Impact table and Selection Matrix both genuine comparisons
U7 format spine                9/10    1    gate   correct spine, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 soundbite                  8/10    0.5  adv    TLDR strong but no distinct standalone Key-Takeaway line elsewhere
U11 callouts                   9/10    0.5  adv    Warning/Gotcha and Thought Process both genuinely non-obvious
U12 failure modes              n/a     -    gate   algorithm article, uses Common Misapplications & Gotchas per spine
U13 vendor examples            9/10    1    adv    DynamoDB and Cassandra named with concrete "why"
U14/R1 no duplicate content    9/10    3    gate   ring mechanism and rebalancing math stated once, consistently referenced elsewhere not restated
U15 section length proportionality 9/10 2  gate   197 lines, well under soft ceiling, sections proportionate to complexity
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered lens blocks
U17 real-world + at-scale      9/10    0.5  adv    ring-imbalance-at-thousands-of-nodes at-scale failure named with concrete mechanism
U19 misconceptions             9/10    0.5  adv    1 solid bullet, genuine wrong-mental-model correction, appropriately not padded
U20 first 30 seconds           n/a     -    adv    not present; advisory for Algorithm, acceptable
U21 in-scope coverage          9/10    2    gate   ring mechanism, virtual nodes, rebalancing, bounded-load extension, when-to-use, key-selection all covered
U22 follow-up probe content    9/10    1    gate   Next-question fields are genuine follow-ups
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-names its own answer's mechanism
AL1 analogy                    9/10    0.5  adv    parking-lot-with-attendant-booths, maps to the actual clockwise-assignment mechanism
AL2 formal definition          9/10    1    gate   ring formal definition stated plainly and concisely
AL3 proof sketch               n/a     -    adv    correctly skipped - mechanism, not a theorem
AL4 assumptions                n/a     -    adv    correctly not forced - When To Use functionally covers this ground
AL5 often confused with        9/10    1    gate   rendezvous hashing (HRW) and sharding-with-remap-table, both genuinely distinct and well-disambiguated
AL6 variants & extensions      9/10    1    gate   virtual nodes and bounded-load extension, both distinct design-implication variants
AL7 complexity & formal properties 9/10 1  gate   O(log N) lookup, ~1/N vs (N-1)/N remap bound, 100-200 virtual node range all stated with practical implications
V1 numeric claim verification  9/10    2    gate   O(log N) lookup correct; ~1/N vs (N-1)/N remap math correct (verified against sharding-strategies.md's identical framing)
V4 terminology precision       9/10    0.5  adv    "sharding" vs "consistent hashing" vs "partitioning" kept precise
V7 prerequisite necessity      7/10    1    gate   Hash Functions genuine dependency in principle but page doesn't exist yet - content-backlog gap, not a defect in this article
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - remap-fraction math matches sharding-strategies.md's Rebalancing section exactly; no contradictions found
--------------------------------------------------------------------------------

GATE: SHIP - all gated params ≥9 except U2 and V7 at 7, both driven by the same root cause (hash-functions.md doesn't exist yet).

BLOCKERS (gated, score ≤8):
- U2/V7: `Hash Functions` prerequisite points to a not-yet-written page. Spec-compliant placeholder usage, but the article's single [Must read] prerequisite is currently unreachable by a reader - a content-backlog gap, not fixable by editing this article.

FIXES (ranked):
1. U2/V7 (weight 1 each): file a content-backlog row for `hash-functions.md` so the prerequisite resolves.
2. U10 (weight 0.5): add a standalone Key-Takeaway soundbite distinct from the TLDR.
```

### `idempotency.md` — 94/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   switch-vs-jar analogy is crisp, maps directly to the trade (SET vs +=), senior-depth
U2 prerequisites format        9/10    1    gate   Message Queues + CAP Theorem, both genuine deps (dedup consumer pattern, partition-driven retry reasoning)
U3 TOC                         9/10    0.5  adv    flat list matches all H2s
U4 TLDR                        9/10    1    gate   flashcard-clean, states the core decision + trade-off
U5 diagrams                    n/a     -    gate   no spatial/state-transition diagram warranted; two numbered-step pseudocode blocks substitute adequately
U6 tables for comparisons      n/a     -    1      no 3+-dimension comparison needed here
U7 format spine                10/10   1    gate   Title→Prereqs→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 interview soundbite        8/10    0.5  adv    mental model doubles as soundbite but no distinct closing one-liner
U11 callouts used correctly    n/a     -    0.5    none used, none needed - prose carries the reasoning adequately at this topic's size
U12 failure modes (two-level)  8/10    0.5  adv    Gotchas section present with 3 inline-shaped bullets, but single-layer not two-level (topic size may not warrant it)
U13 vendor examples            9/10    0.5  adv    Stripe named with a specific, correct mechanism (Idempotency-Key header, 24h TTL)
U14/R1 no duplicate content    10/10   3    gate   no comparison/table restated; PUT/DELETE idempotency explained once
U15 section length proportion  9/10    2    gate   131 lines total, well under soft ceiling, no padding
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank near end, 2 entries, no scattered blocks
U17 real-world + at-scale      9/10    0.5  adv    Stripe named; dedup-table growth/TTL named as the at-scale cost - concrete and specific
U19 common misconceptions      9/10    0.5  adv    2 bullets, both correct wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not written; advisory for Algorithm articles, acceptable
U21 in-scope coverage          9/10    2    gate   assumptions, mechanics (3 approaches), variants, misapplications, gotchas all at senior depth
U22 follow-up probe content    9/10    1    gate   4 Next-question fields, all genuine follow-ups, none reword their own Q
U23 Q/probe leak               10/10   1    gate   no Q or Next-question names its own answer's mechanism
R8 out-of-scope teaching       10/10   1    gate   Message Queues, CAP Theorem mentioned only as intro+link, no full sibling mechanics taught in-place
AL1 analogy                    9/10    1    adv    switch vs coin-jar maps to the exact trade (idempotent vs not), not just naming
AL2 formal definition          10/10   1    gate   f(f(x))=f(x) stated plainly then the practical distributed-systems relaxation
AL3 proof sketch               n/a     -    adv    correctly skipped - idempotency's insight is mechanism, not a proof
AL4 assumptions & preconditions 10/10  1    gate   4 assumptions, each with a concrete violation scenario, genuinely the concept's own boundary conditions
AL5 often confused with        10/10   1    gate   idempotency vs retriable vs exactly-once vs PUT-semantics, all substantively distinguished
AL6 variants & extensions      9/10    1    gate   Idempotency-Key header, conditional idempotency, absolute-value aggregation - three distinct design implications
AL7 complexity & properties    n/a     -    adv    no meaningful time/space/error-bound property beyond what's already in mechanics
V1 numeric/complexity check    9/10    2    gate   Stripe 24h TTL is a real, correct figure
V4 terminology precision       9/10    0.5  adv    "idempotent" vs "retriable" vs "exactly-once" all precisely used, no loose swaps
V7 prerequisite necessity      9/10    1    gate   Message Queues and CAP Theorem both genuinely load-bearing, not topical adjacency
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - saga-pattern.md correctly cites this article's definition for compensations; no contradictions found
V10 at-scale + probe accuracy  9/10    0.5  adv    dedup-table growth/TTL claim real and correctly scoped; both probe answers factually sound
--------------------------------------------------------------------------------

GATE: SHIP - every gated param scores ≥9.

FIXES (ranked, low-impact):
1. U12: single-layer only - if topic grows, add inline H3 gotcha call-outs feeding the consolidated section; not required to ship given current size.
2. U10: no distinct closing soundbite separate from the Mental Model line.
```

### `rate-limiting-algorithms.md` — 95/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   "what state to keep, what too-fast means" framing is a genuine unifying model across all 5 algorithms
U2 prerequisites format        9/10    1    gate   Rate Limiter [Must read] - genuine dependency, this page is the mechanics underneath that component's decision layer
U3 TOC                         9/10    0.5  adv    matches all H2s including each algorithm's own heading
U4 TLDR                        9/10    1    gate   states the shared question, the two axes of trade-off, hands off to Rate Limiter for selection
U5 diagrams                    9/10    1    gate   fixed-window boundary-spike ASCII diagram matches the prose exactly
U6 tables for comparisons      10/10   1    gate   Performance & Complexity table, 4 columns, all 5 algorithms
U7 format spine                10/10   1    gate   Title→Prereqs→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 interview soundbite        8/10    0.5  adv    no single closing memorable line distinct from the mental-model paragraph
U11 callouts used correctly    n/a     -    0.5    none used; genuinely not needed, each algorithm section's "Why X" subheading carries the reasoning inline
U12 failure modes (two-level)  8/10    0.5  adv    Common Misapplications & Gotchas consolidated with 3 named issues, but single-layer (no inline H3 counterpart)
U13 vendor examples            n/a     -    0.5    no vendor named directly (correctly deferred to Rate Limiter's own page)
U14/R1 no duplicate content    10/10   3    gate   Selection Matrix explicitly deferred to Rate Limiter component page rather than restated here
U15 section length proportion  9/10    2    gate   246 lines, well under ceiling; 5 algorithm sections proportionate, none pads or restates
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no per-H2 scattering
U17 real-world + at-scale      9/10    0.5  adv    100k req/day + millions-of-identifiers at-scale cost named for sliding window log specifically
U19 common misconceptions      9/10    0.5  adv    2 bullets, both genuine wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not written; advisory for Algorithm articles
U21 in-scope coverage          9/10    2    gate   all 5 algorithms at mechanics+complexity+gotcha depth; distributed atomic-increment correctly intro+linked to Rate Limiter
U22 follow-up probe content    9/10    1    gate   3 Next-question fields, each a genuine follow-up to the design choice already made
U23 Q/probe leak               9/10    1    gate   no Q/Next-question names its own answer's mechanism
R8 out-of-scope teaching       9/10    1    gate   distributed atomic-increment mechanics correctly deferred via link rather than fully taught
AL1 analogy                    9/10    1    adv    token/leaky-bucket-as-physical-container vs window-as-time-slicing is a real structural analogy
AL2 formal definition          n/a     -    gate   n/a - 5 mechanisms, not one formal concept with a canonical statement; appropriately handled per-algorithm instead
AL3 proof sketch               n/a     -    adv    correctly skipped - mechanism is the whole story
AL4 assumptions & preconditions n/a    -    gate   n/a - no single boundary-condition set spans all 5 algorithms; each algorithm's own trade-off section substitutes
AL5 often confused with        10/10   1    gate   Sliding Window Log vs Counter, and Leaky vs Token Bucket - both substantively distinguished
AL6 variants & extensions      n/a     -    gate   n/a - the 5 algorithms ARE the variants
AL7 complexity & properties    10/10   1    gate   Performance & Complexity table states space/time/boundary-accuracy per algorithm, ties to practical implications
V1 numeric/complexity check    9/10    2    gate   O(1)/O(n) claims per algorithm correct; 2x boundary-spike claim mathematically sound
V4 terminology precision       9/10    0.5  adv    no loose "consistency"/"availability"/"partitioning" swaps found
V7 prerequisite necessity      9/10    1    gate   Rate Limiter genuinely a dependency (this page is explicitly its underlying mechanics)
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - no numeric or definitional conflicts; consistent with idempotency.md's race framing
V10 at-scale + probe accuracy  9/10    0.5  adv    100k/day + millions-of-identifiers claim real, plausible order of magnitude; all 3 probe answers factually sound
--------------------------------------------------------------------------------

GATE: SHIP - every gated param scores ≥9.

FIXES (ranked, low-impact):
1. U12: single-layer gotchas section - if article grows, add inline H3 counterparts within each algorithm's own section.
2. U10: add one explicit closing soundbite sentence distinct from the mental-model paragraph.
```

### `replication-strategies.md` — 96/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   "where the coordination cost is paid" framing is genuinely unifying and senior-level
U2 prerequisites format        9/10    1    gate   CAP Theorem [Must read] + Consistency Models [Should read], both genuine dependencies
U3 TOC                         9/10    0.5  adv    matches all H2s
U4 TLDR                        9/10    1    gate   states the core trade-off, names topology axis, gives 2 concrete vendor contrasts
U5 diagrams                    9/10    1    gate   sync/async/semi-sync ASCII sequence diagram, single-leader topology diagram, quorum overlap diagram - all match prose exactly
U6 tables for comparisons      10/10   1    gate   Quorum config table + Selection Matrix, both genuine dimensions
U7 format spine                10/10   1    gate   Title→Prereqs→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 interview soundbite        8/10    0.5  adv    "coordination cost is paid somewhere" close but embedded in the mental-model paragraph, not standalone
U11 callouts used correctly    10/10   0.5  adv    2 Decision Frameworks, 1 Warning (split-brain), 2 Thought Process - all genuinely non-obvious
U12 failure modes (two-level)  9/10    0.5  adv    split-brain gotcha appears inline AND is referenced in the consolidated Gotchas section - genuine two-level pattern
U13 vendor examples            9/10    0.5  adv    PostgreSQL/MySQL, DynamoDB/Cassandra, Spanner all named with correct specific mechanism
U14/R1 no duplicate content    9/10    3    gate   sharding/replication distinction appears once, cross-linked from sharding-strategies.md - correct single-owner pattern
U15 section length proportion  9/10    2    gate   247 lines, under ceiling; Quorum-Based Replication is deepest (proportionate), no section restates another
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered blocks
U17 real-world + at-scale      9/10    0.5  adv    Spanner's TrueTime/Paxos named as the at-scale exception with the specific mechanism
U19 common misconceptions      9/10    0.5  adv    2 bullets, both genuine wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not written; advisory for Algorithm articles
U21 in-scope coverage          9/10    2    gate   sync/async, all 3 topologies, failover, conflict resolution, lag, quorum all at senior depth
U22 follow-up probe content    9/10    1    gate   3 entries with genuine multi-follow-up Next-question chains
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-states its own answer's mechanism
R8 out-of-scope teaching       9/10    1    gate   consensus/leader-election correctly deferred to consensus-raft-paxos.md; sharding correctly deferred to sharding-strategies.md
AL1 analogy                    9/10    1    adv    HQ-and-branches analogy maps directly to sync/async trade-off
AL2 formal definition          n/a     -    gate   n/a - strategy space (3 topologies × sync modes), Topologies sections serve this role
AL3 proof sketch               n/a     -    adv    correctly skipped - quorum overlap explained mechanically, not as formalism
AL4 assumptions & preconditions n/a    -    gate   n/a - no single boundary-condition set spans all 3 topologies; each topology's own strength/weakness pair substitutes
AL5 often confused with        10/10   1    gate   Sharding vs Replication, and Backup vs Replica - both substantively distinguished
AL6 variants & extensions      n/a     -    gate   n/a - the 3 topologies + quorum tuning ARE the variants
AL7 complexity & properties    9/10    1    gate   quorum W/R/N table states the trade-off, connects to practical read/write-latency implication
V1 numeric/complexity check    9/10    2    gate   W+R>N overlap guarantee mathematically correct; N=3,W=2,R=2 example checks out
V4 terminology precision       9/10    0.5  adv    "linearizability" correctly distinguished from quorum overlap - precise, not conflated
V7 prerequisite necessity      9/10    1    gate   CAP Theorem and Consistency Models both genuinely load-bearing
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - cap-theorem.md, consistency-models.md, sharding-strategies.md, consensus-raft-paxos.md all cross-reference consistently; no contradictions found
V10 at-scale + probe accuracy  9/10    0.5  adv    Spanner TrueTime/Paxos claim real and correctly scoped; all 3 probe answers factually sound
--------------------------------------------------------------------------------

GATE: SHIP - every gated param scores ≥9.

FIXES (low-impact):
1. U10: add a standalone closing soundbite distinct from the mental-model paragraph.
```

### `saga-pattern.md` — 96/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   "falling dominoes you rebuild backward" analogy maps precisely to compensation-not-rollback
U2 prerequisites format        9/10    1    gate   ACID vs BASE [Must read], Idempotency [Must read], Message Queues [Should read] - all genuine
U3 TOC                         9/10    0.5  adv    matches all H2s
U4 TLDR                        9/10    1    gate   states the core mechanism, the trade, the central decision (choreography vs orchestration)
U5 diagrams                    10/10   1    gate   forward-path pseudocode + 2 mermaid sequence diagrams, both match prose exactly
U6 tables for comparisons      10/10   1    gate   Choreography vs Orchestration table (6 dimensions), Selection Matrix in Appendices - distinct shape, not a restatement
U7 format spine                10/10   1    gate   Title→Prereqs→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 interview soundbite        8/10    0.5  adv    dominoes analogy memorable but not phrased as a distinct closing line
U11 callouts used correctly    10/10   0.5  adv    1 Decision Framework, 1 Thought Process, both genuinely non-obvious
U12 failure modes (two-level)  9/10    0.5  adv    compensation-storm failure appears inline and gotchas consolidated separately with distinct content - genuine two layers
U13 vendor examples            9/10    0.5  adv    Camunda/Temporal named as orchestration-framework examples, correctly minimal
U14/R1 no duplicate content    9/10    3    gate   Choreography vs Orchestration comparison stated fully once; Selection Matrix is a distinct condensed form, not a restatement
U15 section length proportion  9/10    2    gate   211 lines, under ceiling; Choreography vs Orchestration gets deepest treatment correctly
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered blocks
U17 real-world + at-scale      9/10    0.5  adv    order-fulfillment/travel-booking named, compensation-storm at-scale failure named with concrete mechanism
U19 common misconceptions      9/10    0.5  adv    2 bullets, both genuine wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not written; advisory for Algorithm articles
U21 in-scope coverage          9/10    2    gate   formal definition, assumptions, mechanics, choreography/orchestration, variants, real-world/at-scale all covered
U22 follow-up probe content    9/10    1    gate   entry 1 correctly uses 2 separate Next-question lines per the multi-follow-up convention
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-states its own answer's mechanism
R8 out-of-scope teaching       9/10    1    gate   Message Queues, ACID/BASE, Idempotency all correctly intro+linked rather than retaught
AL1 analogy                    9/10    1    adv    dominoes analogy maps to the compensation-is-not-rollback trade
AL2 formal definition          10/10   1    gate   T1..Tn with Ci compensations stated plainly, 1 sentence
AL3 proof sketch               n/a     -    adv    correctly skipped - architectural/mechanical insight, not proof-shaped
AL4 assumptions & preconditions 10/10  1    gate   4 assumptions, each with a concrete violation/consequence, genuinely the pattern's own boundary conditions
AL5 often confused with        10/10   1    gate   Saga vs 2PC, Compensating-transaction vs rollback, Saga vs event-sourcing - all three substantively distinguished
AL6 variants & extensions      9/10    1    gate   semantic lock, pivot transaction, saga state machine persistence - 3 genuinely distinct design implications
AL7 complexity & properties    n/a     -    adv    correctly n/a - no meaningful property beyond what mechanics already covers
V1 numeric/complexity check    9/10    2    gate   no numeric claims requiring verification; 2PC blocking-protocol description matches acid-vs-base.md's and consensus-raft-paxos.md's independent descriptions
V4 terminology precision       9/10    0.5  adv    "ACID" and "isolation" used precisely; no loose swaps
V7 prerequisite necessity      9/10    1    gate   all 3 prerequisites genuinely load-bearing, not topical adjacency
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - 2PC description consistent with acid-vs-base.md and consensus-raft-paxos.md; sharding-strategies.md correctly cites Saga with no conflict; no contradictions found
V10 at-scale + probe accuracy  9/10    0.5  adv    compensation-storm claim real and plausible; all 3 probe answers factually sound
--------------------------------------------------------------------------------

GATE: SHIP - every gated param scores ≥9.

FIXES (low-impact):
1. U10: add a standalone closing soundbite distinct from the dominoes mental-model paragraph.
```

### `sharding-strategies.md` — 96/100 — SHIP [type: Algorithm]

```
PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   10/10   1    gate   library-branches analogy maps directly to range-vs-hash trade-off, also correctly distinguishes from consistent hashing
U2 prerequisites format        9/10    1    gate   Consistent Hashing [Must read] + Replication Strategies [Should read], both genuine dependencies
U3 TOC                         9/10    0.5  adv    matches all H2s
U4 TLDR                        9/10    1    gate   states what sharding is, why replication alone doesn't solve it, the range/hash trade-off
U5 diagrams                    9/10    1    gate   range-sharding, hash-sharding, directory-based ASCII diagrams - all match prose exactly
U6 tables for comparisons      10/10   1    gate   Selection Matrix (5 dimensions × 3 strategies), 4-column cap respected
U7 format spine                10/10   1    gate   Title→Prereqs→TOC→TLDR→body→Appendices, no YAML
U8 filename convention         PASS    1    gate   sd-check.sh: PASS
U9 links resolve               PASS    1    gate   sd-check.sh: PASS
U10 interview soundbite        8/10    0.5  adv    no standalone closing soundbite distinct from the mental-model/analogy paragraph
U11 callouts used correctly    10/10   0.5  adv    1 Decision Framework, 1 Thought Process, 1 Gotcha - all genuinely non-obvious
U12 failure modes (two-level)  9/10    0.5  adv    hot-range gotcha appears inline with a distinct consolidated Gotchas section covering different content - genuine two-layer pattern
U13 vendor examples            9/10    0.5  adv    DynamoDB, Cassandra, MongoDB named with correctly distinct specific mechanisms
U14/R1 no duplicate content    9/10    3    gate   replication-vs-sharding stated once, cross-linked to replication-strategies.md's own version - correct single-owner pattern
U15 section length proportion  9/10    2    gate   200 lines, under ceiling; Sharding Strategies gets deepest treatment proportionate to complexity
U16 consolidated interview lens 10/10  3    gate   single Interview Scenario Bank, 3 entries, no scattered blocks
U17 real-world + at-scale      9/10    0.5  adv    DynamoDB/Cassandra/MongoDB compared with real mechanism differences; at-scale failure named concretely
U19 common misconceptions      9/10    0.5  adv    2 bullets, both genuine wrong-mental-model corrections
U20 first 30 seconds           n/a     -    adv    not written; advisory for Algorithm articles
U21 in-scope coverage          9/10    2    gate   3 strategies, rebalancing cost per strategy, cross-shard operations, shard-key selection all at senior depth
U22 follow-up probe content    9/10    1    gate   3 entries, each Next-question a genuine follow-up probing a consequence of the design choice made
U23 Q/probe leak               9/10    1    gate   no Q or Next-question pre-states its own answer's mechanism
R8 out-of-scope teaching       9/10    1    gate   consistent hashing's ring/virtual-node mechanics correctly deferred via link; replication and saga pattern likewise correctly intro+linked
AL1 analogy                    9/10    1    adv    library-branches analogy maps precisely to the range-vs-hash locality trade-off
AL2 formal definition          n/a     -    gate   n/a - strategy space (3 approaches), What It Is + Sharding Strategies sections serve this role
AL3 proof sketch               n/a     -    adv    correctly skipped - no proof-shaped insight, mechanism/trade-off is the whole story
AL4 assumptions & preconditions n/a    -    gate   n/a - "Choosing a Shard Key" section's 3 preconditions substitute for this role well
AL5 often confused with        10/10   1    gate   Replication, Consistent Hashing, Partitioning - all three substantively distinguished, each cross-linked
AL6 variants & extensions      n/a     -    gate   n/a - range/hash/directory strategies ARE the variants
AL7 complexity & properties    9/10    1    gate   Rebalancing section states cost profile per strategy, connects to practical resharding-cost implication
V1 numeric/complexity check    9/10    2    gate   modulo-hashing rebalance cost claim correctly matches consistent-hashing.md's own stated figure for the same phenomenon
V4 terminology precision       9/10    0.5  adv    "sharding" vs "partitioning" precisely distinguished per the conflation list
V7 prerequisite necessity      9/10    1    gate   Consistent Hashing genuinely load-bearing; Replication Strategies genuinely needed for the Often-Confused-With distinction
V9 cross-article consistency   9/10    1    gate   checked against all 10 other algorithms/*.md siblings - modulo-hashing rebalance cost figure matches consistent-hashing.md exactly; replication-vs-sharding definitions match word-for-word in spirit; no contradictions found
V10 at-scale + probe accuracy  9/10    0.5  adv    convenience-shard-key-becomes-hot-at-scale claim real and plausible; all 3 probe answers factually sound
--------------------------------------------------------------------------------

GATE: SHIP - every gated param scores ≥9.

FIXES (low-impact):
1. U10: add a standalone closing soundbite distinct from the library-branches mental-model paragraph.
```
