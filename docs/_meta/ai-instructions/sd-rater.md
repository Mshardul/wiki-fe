# System Design Article Rater

Scores a written system design article (`content/system-design/**/*.md`) for interview-readiness **and bloat**, and gives a **publish gate** (ship / no-ship). Given an article path, follow the steps below and produce a scored report. Scoring is LLM judgment - no separate parser. Filesystem params (U8, U9) should be verified by actually checking the file/links, not guessed.

**Rules live in [sd-writer.md](./sd-writer.md).** That file defines every param (U1, CO2, AL3, HL5, …) - what must be present, in what shape. This file does **not** redefine them; it scores against them by ID and decides publishability. This file owns: detection, the scoring scale, weights, the gate, the [content verification checks](#content-verification-pass-v-checks) (V1-V10, correctness not structure), the [redundancy/bloat checks](#redundancy--bloat-checks-r-checks) (R1-R5, this rater's distinguishing concern), and the report format.

Input accepts one article, several articles, a folder, or "all" - the same selection applies to every check in this file in one pass.

---

## How to use

1. **Read the article** - the full file, not a partial read. Bloat/redundancy checks require seeing the whole thing.
2. **Detect the article kind** (see [sd-writer.md › Article kinds](./sd-writer.md#article-kinds---specific-vs-hub-vs-cheatsheet)):
    - `> **Hub article.**` marker present → **hub** - score with the hub rubric below, skip per-section scoring.
    - Path is `devops-tools/cheatsheets/**` → **cheatsheet** - score only filename convention, working links, and the cheatsheet self-check; mark all conceptual params n/a with reason "cheatsheet article".
    - Neither → **specific article** - proceed with steps 3-7.
3. **Detect the section** from the folder: `components/` → **Component** · `algorithms/` → **Algorithm/Concept** · `hld/` → **HLD** · `devops-tools/` (not `cheatsheets/`) → **DevOps tool**.
4. **Apply params in three tiers:** universal (every article) + the matching section block + the [redundancy/bloat checks](#redundancy--bloat-checks-r-checks) (R1-R5) + the [content verification checks](#content-verification-pass-v-checks) (V1-V10) - all scored in the same pass, same table. Params that don't apply are marked **n/a** and dropped from the total.
5. **Resolve filesystem checks - facts supplied, not guessed.** U8 (filename convention) and U9 (links resolve) must be verified by actually checking the file path and following each `.md` link, not assumed from reading alone.
6. **Score, gate, and report** in the output format at the bottom - one table, structural, redundancy, and content-verification params together.

---

## Hub article rubric

A hub surveys a family and routes to member pages; it is **exempt from the per-section structure** (no full mechanics/gotchas/scenario-bank depth for any one member - that lives on member pages). Do **not** score it against Component/Algorithm/HLD/DevOps section params. Mark those **n/a** with the reason "hub article - covered on member pages." This exemption also covers **U17-U20** (real-world at-scale failure, interviewer probes, misconceptions, first-30-seconds script) - all four are per-member depth content by definition, so mark them **n/a** with the same "hub article - covered on member pages" reason without re-deriving it per report.

Score a hub against **only** these:

| #   | Param                | Gate | What to check |
| --- | --------------------- | ---- | -------------- |
| U1  | Family definition + mental model | gate | What the family is + a mental model, at the family level, not one member's. |
| H1  | Member list           | gate | Every member named, each with a 2-3 sentence description; one working link per member, or plain-text name until that page exists (never a broken link). |
| H2  | Decision layer        | gate | A "which one when" - comparison table and/or selection prose that genuinely helps the reader choose between members, ideally a Quick Decision Guide. |
| H3  | Shared theory (advisory) | adv  | Any genuinely family-level reasoning (shared theory, unifying trade-off) - where one exists. |
| U7  | Format spine          | gate | Title → Prerequisites → TOC → TLDR → body; the `> **Hub article.**` marker present. |
| U8  | Filename convention   | gate | Verified against the file. |
| U9  | Links resolve         | gate | Every live `.md` link resolves; member links not yet wired are plain text, not broken links. |
| U2  | Prerequisites format  | adv  | Name + tier, one-sentence reason specific to the hub. |
| U3  | TOC                   | adv  | Reflects headings. |
| U10 | Soundbite             | adv  | One spoken-aloud family summary. |
| R1  | No duplicate content  | gate | Even a hub can restate the same comparison twice (e.g. in the Quick Decision Guide and again in a Comparison table) - check per [R-checks](#redundancy--bloat-checks-r-checks). |

Scoring scale, weights (U1/H-params weight 1; U8/U9 weight 1, others weight 0.5), the ≥9 gate, and the report format are unchanged. Gate = SHIP only if every gated hub param scores ≥9.

---

## Scoring

- Each applicable param scored **0-10** against its definition in the writer:
    - **9-10** - fully present, correct, **at senior depth**: names the trade not just the choice, states the non-obvious cost/threshold, includes the trap a junior misses. Present-and-correct-but-shallow does **not** reach this band.
    - **6-8** - present and correct but shallow (the strong-junior answer), thin, or missing a sub-part. Most "looks complete" articles land here until depth is added.
    - **3-5** - gestured at but weak / vague / mostly absent.
    - **0-2** - missing or wrong.

    **Depth is the gate between 8 and 9.** If you can't point to the specific senior-level insight, it's an 8, not a 9.

- Each param has a **weight** (below). Overall = weighted average, scaled to **/100**: `overall = round( 100 * Σ(score_i × weight_i) / Σ(10 × weight_i) )` over applicable params only.
- **n/a params** are excluded from both sums - weights renormalize automatically.

### Param caps (judgment notes the score scale can't carry)

- **U14 / R1 (no duplicate content)** - if the same comparison/table/trade-off is fully restated in 2+ places, **cap at 5** (→ blocker), regardless of how good each individual restatement reads. 3+ restatements caps at **2**.
- **U16 (consolidated Interview Lens)** - if any H2 section (outside the dedicated Interview Scenario Bank) contains a full Q/Ideal-answer/Common-trap/Next-question block, **cap at 5** (→ blocker) even if the Scenario Bank section also exists correctly - the rule is "once, consolidated," not "at least once."
- **U5 (diagrams)** - a `<!-- diagram -->` placeholder or TODO instead of a real mermaid/ASCII diagram scores **≤2**.
- **CO3 / AL6 (comparison/selection tables)** - must be an actual table with a real rival, not prose duplicating the Quick Decision Guide / When-to-use section. Prose-only, or a single-row table, **caps at 5** (→ blocker).
- **HL3 (capacity estimation)** - must follow the DAU → QPS → Storage → Bandwidth order and name a dominant constraint. Missing the constraint, or listing numbers with no stated bottleneck, **caps at 5**.
- **HL6 (trade-off summary)** - must be a table (decision log), not prose. Prose-only **caps at 5** (→ blocker).
- **AL3 (proof sketch)** - included where not warranted (mechanism-only topic dressed up with formalism) scores **≤5** for over-scoping; correctly-skipped-with-no-loss is full credit, not a gap.
- **U12 (failure modes, two-level pattern)** - a dedicated summary section that's just a bullet list with no inline H3 counterparts anywhere in the body (or vice versa) **caps at 6** - the pattern requires both layers.
- **DV3 (cheatsheet boundary, DevOps only)** - a command list or step-by-step procedure left in the conceptual article instead of the cheatsheet **caps the article's R-score at 5** (see R3).
- **U18 (interviewer probes)** - if a probe question is a reworded duplicate of an Interview Scenario Bank entry rather than a genuine follow-up to a design choice already made, **cap at 5** (→ blocker) - the two sections must be distinct in kind, not just placement. **Promotion from existing `Next question:` fields is full credit, not a gap** - per the writer's U18 promotion rule, if the dedicated section's entries are lightly-expanded versions of Scenario Bank's own `Next question:` fields with a back-link, score as present; do not penalize for "not written from scratch." Missing entirely (no dedicated section, no promotion, no back-link) is what actually scores ≤5.
- **HL2 (requirements & scope)** - if a conflicting NFR pair (consistency vs availability, latency vs cost) is listed but never resolved with a stated winner + one-sentence why for the specific feature, **cap at 6** - an unresolved NFR list is the junior answer.
- **U19 (misconceptions)** - a bullet that corrects an implementation bug rather than a wrong mental model (i.e. it's actually a gotcha) scores that bullet as **not counted** toward the ≥1 needed for credit; an unjustified n/a (topic genuinely has misconceptions worth naming but none written) scores **≤3**.
- **U20 (framing script)** - a script that summarizes the article's content instead of reading as something spoken aloud in the first 2 minutes of an interview **caps at 5** (→ blocker when gated for HLD).

### Weights

| Weight | Params |
| ------ | ------ |
| **3**  | R1 No duplicate content (U14) · U16 Consolidated Interview Lens |
| **2**  | U15 Section length proportionality · FB family-block-equivalent depth (CO1/AL2+AL3/HL1+HL3/DV1) · V1 Complexity/numeric claim verification · V4 Comparison table accuracy · HL6 Trade-off Summary (HLD) · U18 Interviewer probes (consolidated) |
| **1**  | All other section-core params + U1 def · U2 prerequisites · U4 TLDR · U5 diagrams · U9 links · CO2/AL... when-to-use style params · U12 failure modes · U13 vendor examples · U20 First 30 seconds framing script (HLD only - see conditional gate) |
| **0.5**| U3 TOC · U8 filename · U10 soundbite · U11 callout usage · advisory params · U17 real-world + at-scale · U19 common misconceptions · U20 framing script (Component/Algorithm/DevOps - see conditional gate) · R2, R3, R4, R5 · V2, V3, V5-V10 |

### Gate per param

| Gate | Params |
| ---- | ------ |
| **gated** | U1-U9, U14/R1, U15, U16, U18 · CO1, CO2, CO3 · AL2, AL4, AL5 (when present), AL7 · HL1, HL2, HL3, HL4, HL5, HL6 · DV1, DV3 · V1, V4, V7 |
| **advisory** | U10, U11, U12, U13, U17, U19 · AL1, AL3, AL6 · DV2, DV4 · R2, R3, R4, R5 · V2, V3, V5, V6, V8, V9, V10 |
| **conditional** | **U20 (First 30 seconds framing script)** - **gated** for HLD articles (per sd-writer.md's U20 rule - the opening-scope framing is make-or-break for HLD interviews); **advisory** for Component/Algorithm/DevOps. State which applies in the NOTE. |
| **manual** | **V9 (cross-article consistency)** - no score, no gate contribution; NOTE-only flag for human/agent follow-up. |

---

## Redundancy & bloat checks (R-checks)

This is the check DSA's rater has no equivalent for, and the reason this rater exists: SD articles have no fixed heading list, which means nothing structurally prevents the same idea from being explained three times in three formats. Run these **every time**, not just when an article "feels long."

| #  | Check | What to do | Gate |
| -- | ----- | ---------- | ---- |
| R1 | No duplicate content (U14) | List every X-vs-Y comparison, decision table, or trade-off explanation in the article. For each, note every section it appears in. Any comparison appearing fully-stated in 2+ places is a failure - name both locations in the NOTE. | gate |
| R2 | Length ceiling adherence (U15) | Check each H2 section against the ~150-250 line soft target and the article total against ~400-700 (specific) - if either is exceeded, state **why**: genuine depth (fine) vs restatement (R1 failure) vs a sub-concept that should be a stub/hub split (flag for [Scope management](./sd-writer.md#scope-management--stub-pages)). | adv |
| R3 | Section-overlap / layering | Check the classic overlap: does a "mechanics" section open by re-defining what the mental-model/TLDR already said, instead of explaining the internal mechanism? Does a "when to use" section just restate the mental model instead of giving decision cues? Score 9-10 if each section demonstrably adds a new layer; 3-5 if a section opens by restating the prior one. | adv |
| R4 | Hub-shaped signal | Independent of length: does this article trace **2 or more genuinely distinct mechanisms** at full interview depth (e.g. session auth AND JWT internals AND all OAuth grant types, each with its own mechanics/gotchas/diagrams)? If yes, flag in NOTE that this article should be split into a hub + member pages regardless of its current score - this is a structural recommendation, not something more prose-trimming fixes. | adv |
| R5 | Scenario-Bank overweight | Compare `## Interview Scenario Bank` line count (plus `## What the Interviewer Probes For` if present) against the rest of the article. If Q&A-shaped content is **>40% of total article length**, the article is teaching by quiz instead of teaching the mechanics - flag in NOTE with the ratio and name which mechanics section is thin as a result. This is a teaching-quality signal distinct from U16 (which only checks Scenario Bank is consolidated, not that it's proportionate). | adv |

---

## Content verification pass (V-checks)

Everything above scores whether required content is *present, in shape, at depth, and non-redundant*. It does not check whether the article's claims are *true*. SD articles lean heavily on specific numeric claims (`~0.3ms Redis lookup`, `15 min access token standard`, `O(V²) adjacency matrix`) inside callouts and comparison tables - these need spot-checking like any other claim.

- **Cost:** each check requires independent reasoning, not a lookup. **Scope effort to suspicion, not to a fixed threshold** - skim first, flag what looks off (an unusually precise number, a comparison-table cell that contradicts common knowledge, a complexity claim inconsistent with the mechanism just described, an at-scale claim in U17 whose threshold sounds invented rather than sourced, a probe answer in U18 that resolves too neatly for a genuinely hard follow-up), then spend deep-verification effort only there. For claims that skim clean, a lighter confirmation is enough.
- **Trust model:** run by whichever LLM/agent is invoked - rely on the model's own knowledge. **Show the derivation, not just the verdict** - every V row's NOTE must contain the actual reasoning performed.
- **Scope:** V-checks apply to specific articles only. Mark n/a for hubs/cheatsheets.

| #  | Check | Verifies | Targets | Gate |
| -- | ----- | -------- | ------- | ---- |
| V1 | Numeric/complexity claim verification | Independently check stated latencies, complexities, thresholds, and capacity numbers against real-world knowledge (e.g. "Redis ~0.3ms vs DB ~5-15ms" - is this the right order of magnitude? "O(V²) adjacency matrix" - is that actually right for this representation?). Mismatch → fail. | All numeric claims, U7 complexity/formal properties | gate |
| V2 | Diagram-text agreement | Diagram's component/step count and values match the prose exactly (per writer's diagram-fidelity rule). | U5 | adv |
| V3 | Comparison table row accuracy | Independently verify each rival row's stated properties in Comparison/Selection-Matrix tables - not from the article's own claim. | CO3, AL6, HL6 | adv (gate-weight 2, see Weights) |
| V4 | Terminology precision | Flag loose/incorrect near-synonym use - check specifically against this conflation list before a general skim: "strongly consistent" vs "linearizable" (linearizability is strictly stronger - realtime ordering, not just eventual agreement), "consistency" (CAP sense: single up-to-date copy) vs "consistency" (ACID sense: valid-state transitions) used interchangeably, "availability" vs "durability" (a system can lose no data yet still be unavailable, and vice versa), "latency" vs "throughput" swapped in a capacity argument, "horizontally scalable" asserted without naming the mechanism that makes it true (stateless services vs sharded stateful stores scale horizontally very differently), "partitioning" used as a synonym for "sharding" (sharding is horizontal partitioning across servers specifically - the general term is broader), "stateless" claimed for a component that still pins session/cache affinity. | all | adv |
| V5 | Capacity estimation sanity (HLD only) | Re-derive the QPS/storage/bandwidth numbers from the stated DAU and record size - do the arithmetic actually work out to the stated order of magnitude? | HL3 | adv |
| V6 | Trade-off Summary accuracy (HLD only) | For each row, check the stated "Why" genuinely follows from trade-offs discussed in the body - not a rationalization invented only in the summary table. | HL6 | adv |
| V7 | Prerequisite necessity | For each prerequisite, check it's a genuine concept dependency, not merely related. | U2 | gate |
| V8 | Assumptions/preconditions accuracy (Algorithms only) | Check the stated assumptions (AL4) are the real boundary conditions, not a restatement of the definition. | AL4 | adv |
| V9 | Cross-article consistency | Spot-check this article's claims (definitions, comparison-table rows, numeric claims) against 1-2 sibling articles in the same folder for contradictions. | U1, comparison params | manual |
| V10 | At-scale claim + probe-answer accuracy | For U17's at-scale failure claim: is the stated threshold/mechanism actually real (e.g. "ring imbalance past thousands of nodes" - is that the right order of magnitude and the right cause)? For U18's probe answer sketches: is each 2-3 sentence answer itself factually correct, not just well-formatted? A plausible-sounding but wrong answer sketch is worse than none - it teaches the wrong thing with false confidence. | U17, U18 | adv |

---

## Output format

```
<filename>  -  <overall>/100  -  <SHIP | NO-SHIP>   [type: <Component|Algorithm|HLD|DevOps|Hub|Cheatsheet>]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   clean one-liner + analogy
R1 no duplicate content        4/10    3    gate   stateful-vs-stateless fully restated in Quick Decision Guide (L66-82) AND Decision Framework table (L195-206) - BLOCKER
U16 consolidated interview lens 3/10   3    gate   12 separate per-H2 Interview Lens blocks found, no single Interview Scenario Bank section - BLOCKER
U15 section length proportionality 4/10 2  gate   Token Revocation Strategies section (753-827) restates Revocation Gap mitigations (403-407) nearly verbatim - BLOCKER, see R1
CO1 core mechanics             9/10    1    gate   clear internal mechanism, cache-miss behavior named
HL6 trade-off summary          n/a     -    -      (not an HLD article)
U17 real-world + at-scale      8/10   0.5   adv    names Redis Cluster; at-scale failure (ring imbalance) stated but shallow
U18 interviewer probes         9/10    2    gate   2 genuine follow-ups on the eviction-policy choice, distinct from Scenario Bank
U19 common misconceptions      7/10   0.5   adv    1 bullet present ("cache-aside guarantees freshness") but only 1, could use 2-3
U20 first 30 seconds           n/a     -    adv    (Component article - advisory, not written; acceptable but lowers score slightly)
V1 numeric claim verification  8/10    2    gate   Redis ~0.3ms / DB ~5-15ms checked - plausible order of magnitude, minor: DB figure optimistic for cross-region
R4 hub-shaped signal           -       -    adv    FLAG: article traces session-auth + JWT internals + 4 OAuth grants + MFA at full depth each - recommend hub + member split
R5 scenario-bank overweight    7/10   0.5   adv    Scenario Bank + Probes = ~22% of article - proportionate, mechanics sections carry real depth
V9 cross-article consistency   n/a     -    manual  no sibling articles checked this pass
V10 at-scale + probe accuracy  8/10   0.5   adv    ring-imbalance claim checked - order of magnitude right for consistent hashing; both probe answers factually sound
--------------------------------------------------------------------------------

GATE: NO-SHIP - 3 gated params below 9 (R1, U16, U15).

BLOCKERS (gated, score ≤8 - fix before publish):
- R1: consolidate stateful-vs-stateless into one place (recommend the Decision Framework table at L195); replace the Quick Decision Guide's inline restatement with a link back to it
- U16: collapse all 12 per-H2 Interview Lens blocks into one `## Interview Scenario Bank` section near the end, keeping only the 4-6 highest-value questions
- U15: split JWT internals, OAuth flows, and MFA into their own pages; convert this article into a hub (see R4)

FIXES (ranked, highest-impact first = weight tier, then score gap):
1. ...
2. ...
```

Rules for the report:

- Every applicable param gets a row. **n/a** params still listed with a one-line justification - an unjustified n/a is treated as a low score, never a free pass.
- **GATE verdict** = SHIP only if every gated param scores ≥9; otherwise NO-SHIP.
- **NOTE** is one line for weight-0.5/1 params; **two lines max** for weight-2/3 params when the fix needs specifics (mark `(2-line: weight-N)`).
- **BLOCKERS** (gated ≤8) listed first in FIXES, ranked by weight tier (3 → 2 → 1 → 0.5) then by score gap within tier.
- Fixes are concrete: name the section, the change, the target location. "Merge the two stateful-vs-stateless tables into the one at L195, delete the other", not "reduce repetition".

---

## Batch audit (maintenance)

Run after a batch of new/edited articles, or when triaging an existing bloated article, to surface portfolio-level patterns.

```bash
# Articles over the soft length ceiling - candidates for R1/R2/R4 review
find content/system-design -name '*.md' ! -path '*/cheatsheets/*' -exec wc -l {} \; | awk '$1 > 900'

# Articles with more than one Interview Lens block outside a consolidated section (U16 violation signal)
grep -rlc '🎯 \*\*Interview Lens\*\*' content/system-design/**/*.md | awk -F: '$2 > 1'

# Components/Algorithms/HLD/DevOps missing a consolidated Interview Scenario Bank
grep -rL 'Interview Scenario Bank' content/system-design/components/*.md content/system-design/algorithms/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# Articles missing a Production Failure Modes summary (U12)
grep -rL 'Production Failure Modes' content/system-design/components/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# Articles missing consolidated Interviewer Probes section (U18)
grep -rL 'What the Interviewer Probes For' content/system-design/components/*.md content/system-design/algorithms/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# HLD articles missing the First 30 seconds framing script (U20 - gated for HLD)
grep -rL 'First 30 [Ss]econds\|30-[Ss]econd' content/system-design/hld/*.md

# HLD articles missing a Trade-off Summary (HL6)
grep -rL 'Trade-off Summary' content/system-design/hld/*.md
```

These don't gate any article individually - they help prioritize which existing articles (like the known-bloated `authentication.md`, `caching.md`, `load-balancer.md`) to re-rate and trim/split next.
