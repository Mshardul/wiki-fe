# System Design Article Rater

Scores a written system design article (`content/system-design/**/*.md`) for interview-readiness **and bloat**, and gives a **publish gate** (ship / no-ship). Given an article path, follow the steps below and produce a scored report. Scoring is LLM judgment - no separate parser, except U8/U9 which are deterministic (see step 5) - never LLM-guessed.

**Rules live in [sd-writer.md](./sd-writer.md).** That file defines every param (U1, CO2, AL3, HL5, …) - what must be present, in what shape. This file does **not** redefine them; it scores against them by ID and decides publishability. This file owns: detection, the scoring scale, weights, the gate, the [content verification checks](#content-verification-pass-v-checks) (V1-V10, correctness not structure), the [redundancy/bloat checks](#redundancy--bloat-checks-r-checks) (R1-R8, including topic-boundary R8), and the report format. Do not look for a `## Scope` heading in articles - owns/does-not-own is inferred from the filename, body, and links per [sd-writer.md › Topic boundary](./sd-writer.md#topic-boundary-owns-vs-does-not-own).

Input accepts one article, several named articles, a whole folder, or "all" - the same selection applies to every check in this file in one pass. **For a multi-article batch, group by folder (rate all of `components/`, then all of `algorithms/`, etc. - not interleaved)** - this is what lets the [V9 claims cache](#v9-claims-cache-cost-control) actually pay off, since V9's sibling comparisons never cross folders anyway. **The [rating cache](#rating-cache-skip-unchanged-articles)'s cache-skip applies only to "all of a folder" or "all" (a full, unfiltered group) - never to an explicitly named subset.** "Rate `components/`" is a full group and gets cache-skip; "rate `caching.md` and `load-balancer.md`" names a subset and always gets a full rate on both, cache ignored, per step 0.

---

## How to use

0. **Check the [rating cache](#rating-cache-skip-unchanged-articles) first, full-group runs only ("all", or a whole named folder) - never for an explicit file list.** The cache-skip applies **only** when the input is an unfiltered group - literally "all," or "rate all of `components/`." The moment the user names specific file(s) instead - one file, a handful, "these 3 articles" - **every named file gets a full rate, cache ignored**, regardless of whether its hash matches. Naming a file is itself a signal it's the thing under review right now; a cache hit would silently report a stale verdict on the exact file the user is asking about. The cache exists to make "rate everything (in this scope)" affordable, not to let a targeted check quietly skip work.
1. **Read the article** - the full file, not a partial read. Bloat/redundancy checks require seeing the whole thing.
2. **Detect the article kind** (see [sd-writer.md › Article kinds](./sd-writer.md#article-kinds---specific-vs-hub-vs-cheatsheet)):
    - `> **Hub article.**` marker present → **hub** - score with the hub rubric below, skip per-section scoring.
    - File path is `devops-tools/cheatsheets/**` → **cheatsheet** - score only filename convention, working links, and the cheatsheet self-check; mark all conceptual params n/a with reason "cheatsheet article".
    - File path is `system-design/paths/**` → **path** - score with the path rubric below, skip per-section scoring.
    - None of the above → **specific article** - proceed with steps 3-7.
3. **Detect the section** from the folder: `components/` → **Component** · `algorithms/` → **Algorithm/Concept** · `hld/` → **HLD** · `devops-tools/` (not `cheatsheets/`) → **DevOps tool**.
4. **Apply params in three tiers:** universal (every article, including U21) + the matching section block + the [redundancy/bloat checks](#redundancy--bloat-checks-r-checks) (R1-R8) + the [content verification checks](#content-verification-pass-v-checks) (V1-V10) - all scored in the same pass, same table. Params that don't apply are marked **n/a** and dropped from the total.
5. **Resolve filesystem checks via the pre-check script - facts supplied, not guessed.** U8 (filename convention) and U9 (links resolve) are deterministic and must not vary run-to-run. Run `../../../scripts/sd-check.sh <article.md>` (Bash wrapper over `sd_check.py`, same pattern as [DSA's dsa-check.sh](../../../scripts/dsa-check.sh)) and paste its PASS/FAIL lines into the U8/U9 rows. Do **not** judge these two from reading alone - the LLM's job here is to read the script's output and transcribe it, not re-derive it. If the script can't run, say so in the report and fall back to a manual check - never silently guess. **V9 (cross-article consistency) must actually check every same-folder sibling's claims** - via the [V9 claims cache](#v9-claims-cache-cost-control) where a fresh cache entry exists, via a full read otherwise. Never inferred from memory or skipped for time.
6. **Score, gate, and report** in the output format at the bottom - one table, structural, redundancy, and content-verification params together.

---

## Hub article rubric

A hub surveys a family and routes to member pages; it is **exempt from the per-section structure** (no full mechanics/gotchas/scenario-bank depth for any one member - that lives on member pages). Do **not** score it against Component/Algorithm/HLD/DevOps section params. Mark those **n/a** with the reason "hub article - covered on member pages." This exemption also covers **U17, U22's Next-question probes, U19, U20** (real-world at-scale failure, interviewer probes, misconceptions, first-30-seconds script) - all are per-member depth content by definition, so mark them **n/a** with the same "hub article - covered on member pages" reason without re-deriving it per report.

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
| U21 | In-scope coverage     | gate | Family-level: member list complete enough to route, decision layer present. Do not score missing per-member mechanics as U21 holes - those live on member pages. |
| R8  | Out-of-scope teaching | gate | Hub must not trace any member at full mechanics/gotchas/scenario-bank depth. Intro + link (the member list) is the cap. |

Scoring scale, weights (U21 weight 2, R8/U1/H-params/U8/U9 weight 1, others 0.5 unless the global weights table says otherwise), the ≥9 gate, and the report format are unchanged. Gate = SHIP only if every gated hub param scores ≥9.

---

## Path rubric

A path is a curated, ordered route through existing articles - it teaches nothing directly. Do **not** score it against Component/Algorithm/HLD/DevOps/Hub params, U1-U7, U10-U20, or any CO/AL/HL/DV param - mark all n/a with reason "path article - routes to member content, teaches nothing directly."

Score a path against **only** these (U21/R8 and all conceptual params are n/a - reason "path article - routes to member content, teaches nothing directly"):

| #   | Param              | Gate | What to check |
| --- | ------------------- | ---- | -------------- |
| P1  | Format spine         | gate | Title (`# Learning Path: [Track Name]`) → scope line (target bar + duration) → sibling-tracks cross-link → `## Path` table → `## Explicitly skipped in this track`. No TLDR/Prerequisites/TOC sections (not required for this kind). |
| P2  | Stage ordering        | gate | `Stage` column values are ascending; rows sharing a stage number are a coherent group, not arbitrary. |
| P3  | Skipped-scope reasoning | gate | `## Explicitly skipped in this track` names a real reason or a specific sibling track that covers it - not empty, not vague filler. |
| U8  | Filename convention   | gate | Verified against the file. |
| U9  | Links resolve         | gate | Every `Topic` cell link resolves to a real file, or is plain text if the target doesn't exist yet - never a broken `.md` link. |

Scoring scale and the ≥9 gate are unchanged (all path params weight 1). Gate = SHIP only if every path param scores ≥9.

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
- **U21 (in-scope coverage)** - a missing senior facet **of this named mechanism** (no on-page treatment and no intro+link to an owning sibling) **caps at 5** (→ blocker). Do **not** fail U21 for missing encyclopedia adjacency or for a sibling topic that belongs on another page. Inventing a syllabus and then scoring holes against it is itself a miss - name the facet that a senior interview on *this* topic would actually probe. HLD: missing system-level composition/capacity/trade-off is a hole; missing a full component tutorial is not (that's R8 if you wrote one, or intro+link if you didn't).
- **R8 (out-of-scope teaching)** - an extractable sibling taught at full mechanics/gotchas/scenario-bank depth **caps at 5** (→ blocker). 2+ such siblings on the same page cap at **2**. Intro (2-3 sentences) + link is a pass, including on HLD pages that compose many components. Hubs: any member traced at full depth is the same fail.
- **U16 (consolidated Interview Lens section)** - if any H2 section (outside the dedicated Interview Scenario Bank) contains a full Q/Ideal-answer/Common-trap/Next-question block, **cap at 5** (→ blocker) even if the Scenario Bank section also exists correctly - the rule is "once, consolidated," not "at least once." A standalone `## What the Interviewer Probes For` H2 elsewhere in the article is the same violation - probes live inside Interview Scenario Bank's `Next question` fields (or a trailing subgroup within it), never as their own top-level section - **cap at 5** if found.
- **U22 (follow-up probe content)** - if a `Next question:` field (or trailing probes subgroup) is a reworded duplicate of its own entry's `Q:` rather than a genuine follow-up to a design choice already made, treat as a gap within U22's score - the probe must be distinct in kind from the opening question, not just present. Missing follow-up depth entirely (Scenario Bank entries with no substantive `Next question:` content anywhere) is what drags U22 below 9. **Two questions crammed into one `Next question:` field** (e.g. `"Q1?" → A1. "Q2?" → A2.` run together in prose within a single field) is a formatting defect, not a depth issue - flag it under U22's NOTE and require splitting into separate `**Next question:**` lines, one per follow-up, rather than scoring it as missing content.
- **U23 (Q/probe leak)** - if a `Q:` field or `**Next question:**` field names the mechanism/technique that answers it (the reader can lift the answer's key term straight out of the question, e.g. "why does consistent hashing use virtual nodes to fix ring imbalance?"), that entry doesn't test recall - it confirms a fact the question already gave away. Check every entry's `Q:` and `Next question:` field(s) for this; **2+ leaking entries in one article caps U23 at 5** (→ blocker), a single leaking entry is a NOTE-level flag that lowers the score without blocking.
- **U5 (diagrams)** - a `<!-- diagram -->` placeholder or TODO instead of a real mermaid/ASCII diagram scores **≤2**.
- **CO3 / AL6 (comparison/selection tables)** - must be an actual table with a real rival, not prose duplicating the Quick Decision Guide / When-to-use section. Prose-only, or a single-row table, **caps at 5** (→ blocker).
- **HL3 (capacity estimation)** - must follow the DAU → QPS → Storage → Bandwidth order and name a dominant constraint. Missing the constraint, or listing numbers with no stated bottleneck, **caps at 5**.
- **HL6 (trade-off summary)** - must be a table (decision log), not prose. Prose-only **caps at 5** (→ blocker).
- **AL3 (proof sketch)** - included where not warranted (mechanism-only topic dressed up with formalism) scores **≤5** for over-scoping; correctly-skipped-with-no-loss is full credit, not a gap.
- **U12 (failure modes, two-level pattern)** - a dedicated summary section that's just a bullet list with no inline H3 counterparts anywhere in the body (or vice versa) **caps at 6** - the pattern requires both layers.
- **DV3 (cheatsheet boundary, DevOps only)** - a command list or step-by-step procedure left in the conceptual article instead of the cheatsheet **caps the article's R-score at 5** (see R3).
- **HL2 (requirements & scope)** - if a conflicting NFR pair (consistency vs availability, latency vs cost) is listed but never resolved with a stated winner + one-sentence why for the specific feature, **cap at 6** - an unresolved NFR list is the junior answer.
- **U19 (misconceptions)** - a bullet that corrects an implementation bug rather than a wrong mental model (i.e. it's actually a gotcha) scores that bullet as **not counted** toward the ≥1 needed for credit; an unjustified n/a (topic genuinely has misconceptions worth naming but none written) scores **≤3**.
- **U20 (framing script)** - a script that summarizes the article's content instead of reading as something spoken aloud in the first 2 minutes of an interview **caps at 5** (→ blocker when gated for HLD).
- **V9 (cross-article consistency)** - any genuine contradiction found against a same-folder sibling (not just differing depth/scope, an actual conflicting claim) **caps at 5** (→ blocker); 2+ contradictions across different siblings caps at **2**. Checking fewer than all same-folder siblings, or listing siblings without stating what was compared, is treated as incomplete and **caps at 6**.

### Weights

| Weight | Params |
| ------ | ------ |
| **3**  | R1 No duplicate content (U14) · U16 Consolidated Interview Lens section |
| **2**  | U15 Section length proportionality · U21 In-scope coverage · FB family-block-equivalent depth (CO1/AL2+AL3/HL1+HL3/DV1) · V1 Complexity/numeric claim verification · V4 Comparison table accuracy · HL6 Trade-off Summary (HLD) |
| **1**  | All other section-core params + U1 def · U2 prerequisites · U4 TLDR · U5 diagrams · U9 links · U22 Follow-up probe content · U23 Q/probe leak · CO2/AL... when-to-use style params · U12 failure modes · U13 vendor examples · U20 First 30 seconds framing script (HLD only - see conditional gate) · V9 cross-article consistency · R8 Out-of-scope teaching |
| **0.5**| U3 TOC · U8 filename · U10 soundbite · U11 callout usage · advisory params · U17 real-world + at-scale · U19 common misconceptions · U20 framing script (Component/Algorithm/DevOps - see conditional gate) · R2, R3, R4, R5, R6, R7 · V2, V3, V5-V10 |

### Gate per param

| Gate | Params |
| ---- | ------ |
| **gated** | U1-U9, U14/R1, U15, U16, U21, U22, U23, R8 · CO1, CO2, CO3 · AL2, AL4, AL5 (when present), AL7 · HL1, HL2, HL3, HL4, HL5, HL6 · DV1, DV3 · V1, V4, V7, V9 |
| **advisory** | U10, U11, U12, U13, U17, U19 · AL1, AL3, AL6 · DV2, DV4 · R2, R3, R4, R5, R6, R7 · V2, V3, V5, V6, V8, V10 |
| **conditional** | **U20 (First 30 seconds framing script)** - **gated** for HLD articles (per sd-writer.md's U20 rule - the opening-scope framing is make-or-break for HLD interviews); **advisory** for Component/Algorithm/DevOps. State which applies in the NOTE. |

---

## Redundancy & bloat checks (R-checks)

This is the check DSA's rater has no equivalent for, and the reason this rater exists: SD articles have no fixed heading list, which means nothing structurally prevents the same idea from being explained three times in three formats, or a sibling topic from being fully taught in-place. Run these **every time**, not just when an article "feels long." Owns vs does-not-own is **not** an on-page heading - infer it (U21 + R8).

| #  | Check | What to do | Gate |
| -- | ----- | ---------- | ---- |
| R1 | No duplicate content (U14) | List every X-vs-Y comparison, decision table, or trade-off explanation in the article. For each, note every section it appears in. Any comparison appearing fully-stated in 2+ places is a failure - name both locations in the NOTE. | gate |
| R2 | Length ceiling adherence (U15) | Check each H2 section against the ~150-250 line soft target and the article total against ~400-700 (specific) - if either is exceeded, state **why**: genuine depth of this mechanism (fine) vs restatement (R1) vs in-scope hole padded with siblings (U21/R8) vs a sub-concept that should be extracted (flag for [Topic boundary](./sd-writer.md#topic-boundary-owns-vs-does-not-own) rule A). | adv |
| R3 | Section-overlap / layering | Check the classic overlap: does a "mechanics" section open by re-defining what the mental-model/TLDR already said, instead of explaining the internal mechanism? Does a "when to use" section just restate the mental model instead of giving decision cues? Score 9-10 if each section demonstrably adds a new layer; 3-5 if a section opens by restating the prior one. | adv |
| R4 | Hub-shaped signal | Independent of length: after mentally applying rule A (extract siblings first), would this unmarked specific article still trace **2 or more genuinely distinct mechanisms** at full interview depth? If yes, flag hub + members - not a prose-trim. If only one leftover mechanism plus extractable siblings, that is R8 + extract, **not** R4. | adv |
| R5 | Scenario-Bank overweight | Compare `## Interview Scenario Bank` line count (inclusive of its follow-up-probe `Next question` fields - there should be no separate `## What the Interviewer Probes For` section; flag as a structure violation under U16 if one exists) against the rest of the article. If Q&A-shaped content is **>40% of total article length**, the article is teaching by quiz instead of teaching the mechanics - flag in NOTE with the ratio and name which mechanics section is thin as a result. This is a teaching-quality signal distinct from U16 (which only checks Scenario Bank is consolidated, not that it's proportionate). | adv |
| R6 | Reading-order coherence | Read the article top-to-bottom as a first-time reader, not section-by-section against param checklists. Does each section require only what came before it, or does it lean on a concept explained later? Check specifically: does a Quick Decision Guide/When-to-use section appear **before** the mechanics it presupposes (writer spec requires it placed *after* Core Mechanics - "readers understand trade-offs better once they understand the mechanics")? A guide placed early because it doubles as a table-of-contents-style router is still a reading-order violation, not a defensible exception - flag it. Score 9-10 if the body reads as a coherent build-up; 3-5 if a first-time reader would hit a forward-reference or a decision they can't yet evaluate. | adv |
| R7 | Redundant-in-spirit restatement | Distinct from R1 (which only catches a comparison/table *literally* restated). Check whether the **same single idea** is independently re-explained via diagram + prose walkthrough + callout + Scenario-Bank answer, where each format is technically non-duplicate text but the 2nd/3rd/4th telling adds no new information a reader didn't already have after the 1st. This is legal-by-R1 but still padding. Flag in NOTE which formats are redundant and which one should be kept (usually the diagram or the first prose explanation - cut the rest or make them add a genuinely new angle, e.g. the callout adds the *exception* rather than repeating the *rule*). | adv |
| R8 | Out-of-scope teaching (gated) | Infer extractable siblings from other specific-article topics (same or other SD folders) that this body teaches at full depth. Full mechanics/gotchas/scenario-bank for a sibling = fail (see param cap). Intro + link = pass. HLD composing cache/LB/DB with intro + link = pass; a nested full cache article inside an HLD = fail. Do not treat refused layers (runbooks, full implementations) as R8 siblings - those are NEVER, score under U15/structure. Paths/cheatsheets: n/a. | gate |

**Scenario Bank as sole source of an insight:** if a genuinely new explanatory point (not just an interview-answer framing of something already covered) exists **only** inside an `Interview Scenario Bank` entry's `Ideal answer`/`Next question` field and nowhere in body prose, that is a gap, not a feature of the section - the Scenario Bank's job is fast pre-interview recall, not sole custodianship of an idea. Flag under U22's NOTE (not a separate check) and recommend surfacing the insight briefly in the relevant body section, while keeping the Scenario Bank entry as-is for quick-glance review.

---

## Content verification pass (V-checks)

Everything above scores whether required content is *present, in shape, at depth, and non-redundant*. It does not check whether the article's claims are *true*. SD articles lean heavily on specific numeric claims (`~0.3ms Redis lookup`, `15 min access token standard`, `O(V²) adjacency matrix`) inside callouts and comparison tables - these need spot-checking like any other claim.

- **Cost:** each check requires independent reasoning, not a lookup. **Scope effort to suspicion, not to a fixed threshold** - skim first, flag what looks off (an unusually precise number, a comparison-table cell that contradicts common knowledge, a complexity claim inconsistent with the mechanism just described, an at-scale claim in U17 whose threshold sounds invented rather than sourced, a Scenario Bank `Next question` probe answer that resolves too neatly for a genuinely hard follow-up), then spend deep-verification effort only there. For claims that skim clean, a lighter confirmation is enough. **Exception: V9 is exempt from this scoping-to-suspicion rule** - it is a mandatory full pass over every same-folder sibling regardless of whether anything looks suspicious, since a contradiction between two confidently-written articles won't "look off" from either one alone.
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
| V9 | Cross-article consistency | **Mandatory, exhaustive, never a skim** - but see [V9 claims cache](#v9-claims-cache-cost-control) for how exhaustive is kept affordable across a batch run. Diff every numeric claim, definition, and comparison-table row this article makes against what each same-folder sibling says - not just topical overlap, an actual conflicting statement. A confidently-written wrong number (e.g. Redis latency stated as `~0.3ms` in three sibling articles and `~0.5ms` in this one) will not "look suspicious" from inside the article being rated - it only surfaces by literally comparing the two numbers side by side. List every sibling checked in the NOTE with the specific claims compared (not just "checked, no issues") - a NOTE that doesn't name what was compared is itself a V9 failure per the existing cap rule below. | U1, comparison params, all numeric/terminology claims | gate |
| V10 | At-scale claim + probe-answer accuracy | For U17's at-scale failure claim: is the stated threshold/mechanism actually real (e.g. "ring imbalance past thousands of nodes" - is that the right order of magnitude and the right cause)? For U22's `Next question:` probe answers: is each answer itself factually correct, not just well-formatted? A plausible-sounding but wrong answer is worse than none - it teaches the wrong thing with false confidence. | U17, U22 (probes) | adv |

---

## V9 claims cache (cost control)

V9 exhaustiveness is the single most expensive check in this rater - naive exhaustive comparison in a folder of *n* articles costs O(n²) full-file reads across a full-folder batch run. This cache makes exhaustive affordable by extracting each file's checkable claims **once**, then reusing the extraction for every other article's V9 pass against it, instead of re-reading full prose per comparison.

**What's cached, per folder:** one JSON file at `content/system-design/<folder>/.v9-cache.json` (same folder V9 already scopes comparisons to - components/, algorithms/, hld/, devops-tools/). One entry per article:

```json
{
  "caching.md": {
    "mtime": "2026-08-14T10:22:00Z",
    "claims": {
      "definitions": ["cache-aside: app checks cache, on miss reads DB and populates cache"],
      "numeric": ["Redis lookup ~0.5ms (L871)", "L1 cache ~1µs (L871)", "DB lookup ~5-15ms"],
      "comparison_rows": ["Redis vs Memcached: persistence, clustering, data structures - see Comparison table"],
      "terminology": ["uses 'consistency' in CAP sense at L502, ACID sense at L340 - both used correctly"]
    }
  }
}
```

- **Extraction is a byproduct of rating, not extra work.** When V9 runs on an article normally (reading it, checking its claims against siblings), the claims it needed to state in the NOTE are exactly the cache entry - write them out as this article's cache entry as part of that same pass. No separate extraction step.
- **Reuse rule:** before running V9 for article A against sibling B, check B's cache entry. If present and `mtime` matches B's current file mtime, use the cached claims - do not re-read B's full file. If missing or stale (B edited since cached), read B fully once, run the comparison, and refresh B's cache entry.
- **First rating of a fresh/uncached folder still pays full cost once** - every file gets fully read to seed its cache entry. The saving is on the **second and later** article rated in the same run/folder, and on **later runs entirely** (persisted cache survives across sessions).
- **Invalidation is mtime-based, not content-hash-based** - simpler, and edits always bump mtime. If a file's mtime changed since its cache entry, treat the entry as stale and re-extract, regardless of whether the actual claims changed.
- **The cache file is a build artifact, not content** - add `.v9-cache.json` to `.gitignore` in each `content/system-design/*/` folder (or one root-level glob entry `content/system-design/**/.v9-cache.json`). Never commit it, never treat it as authoritative over the source article - if the cache and the article ever disagree, the article wins and the cache gets refreshed.
- **Batch-by-type is what makes this pay off.** Because V9's comparison boundary is already the folder (see V9's Targets column - comparisons stay within `components/*.md`, `algorithms/*.md`, etc., never cross-folder), rating one folder's articles together in one run - not interleaved with other folders - means every sibling read in that run has a chance to be reused by every other article in the same run. Interleaving folders (rate one component, one algorithm, one component, …) gets none of the reuse benefit within a run, though the persisted cache still helps across runs.

---

## Rating cache (skip unchanged articles)

The V9 claims cache above saves cost on the *sibling-read* portion of a rating. This cache saves the cost of the **entire rating pass** for articles that haven't changed since they were last rated - the dominant cost when "rate all" is run repeatedly over a mostly-stable corpus, since re-deriving all ~40 params from scratch on a stable article produces the same verdict every time.

**What's cached, per folder:** one JSON file at `content/system-design/<folder>/.rating-cache.json`. One entry per article:

```json
{
  "caching.md": {
    "content_hash": "sha256:9f2a...",
    "last_rated": "2026-08-14T10:22:00Z",
    "overall": 82,
    "gate": "NO-SHIP",
    "blockers": ["R1", "V9"]
  }
}
```

- **`content_hash` is a hash of the article's own bytes** - not mtime. Mtime can change without content changing (touch, re-save, git checkout); a content hash only invalidates on an actual edit, which is what actually invalidates a rating. `sha256` of the file content is sufficient - no need for anything fancier.
- **Cache hit (hash matches):** skip the full rate entirely. Report the cached `overall`/`gate`/`blockers` directly, tagged `(cached - unchanged since last rating)` in the report header, so the reader knows this wasn't freshly re-derived.
- **Cache miss (hash differs or no entry):** run the full rate as normal, then write/update the entry with the new hash, verdict, and score once scoring completes.
- **This cache and the [V9 claims cache](#v9-claims-cache-cost-control) are independent but related** - a rating-cache hit skips V9 entirely for that article (nothing to extract, the old verdict already accounted for whatever siblings existed then). A rating-cache **miss** still benefits from the V9 claims cache for whichever siblings are themselves still hash-stable.
- **Staleness risk this cache accepts, deliberately:** if article A is unchanged but a *sibling* B changed in a way that would newly contradict A (a V9-shaped issue), a cache-hit on A will not catch it - A's cached verdict predates B's edit. This is an accepted trade for batch-run speed, not an oversight. **Mitigate it two ways:** (1) any full rate of B (a miss, since B changed) should note in its own V9 row if it found a new contradiction with a cached sibling - that's a natural trigger to also invalidate A's cache entry; (2) periodically (e.g. before a larger publish push) run one pass with the rating cache disabled to force a full sweep and catch any drift the incremental hits missed. State in the report when a full-sweep pass (cache bypassed) was last run, if known.
- **The cache file is a build artifact, not content** - same treatment as the V9 cache: gitignored, never authoritative over the article itself. Already covered by the `content/system-design/**/.v9-cache.json`-style gitignore entry pattern - add `content/system-design/**/.rating-cache.json` alongside it.
- **Bypass the cache explicitly when:** the input is any explicit file list, one file or several, not literally "all" (per step 0 above - naming files always means full rate, cache ignored, on every named file); the user asks to force a re-rate; or the cache file itself looks corrupted/unreadable (fall back to a full rate for that article, same as a miss).

---

## Output format

```
<filename>  -  <overall>/100  -  <SHIP | NO-SHIP>   [type: <Component|Algorithm|HLD|DevOps|Hub|Cheatsheet>]

PARAM                          SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 mental model + definition   9/10    1    gate   clean one-liner + analogy
R1 no duplicate content        4/10    3    gate   stateful-vs-stateless fully restated in Quick Decision Guide (L66-82) AND Decision Framework table (L195-206) - BLOCKER
U16 consolidated interview lens 3/10   3    gate   12 separate per-H2 Interview Lens blocks found, no single Interview Scenario Bank section - BLOCKER (a separate `## What the Interviewer Probes For` H2 was also found, same violation)
U22 follow-up probe content   6/10    1    gate   present but 4 of 12 Next-question fields just reword their own Q: - BLOCKER
U23 Q/probe leak              9/10    1    gate   no entry names its answer's mechanism in the Q: or Next-question field
U15 section length proportionality 4/10 2  gate   Token Revocation Strategies section (753-827) restates Revocation Gap mitigations (403-407) nearly verbatim - BLOCKER, see R1
U21 in-scope coverage          5/10    2    gate   senior stampede/invalidation facet missing and no sibling link - BLOCKER
R8 out-of-scope teaching       5/10    1    gate   JWT internals taught at full mechanics/gotchas depth; extract jwt.md, leave intro+link - BLOCKER
CO1 core mechanics             9/10    1    gate   clear internal mechanism, cache-miss behavior named
HL6 trade-off summary          n/a     -    -      (not an HLD article)
U17 real-world + at-scale      8/10   0.5   adv    names Redis Cluster; at-scale failure (ring imbalance) stated but shallow
U19 common misconceptions      7/10   0.5   adv    1 bullet present ("cache-aside guarantees freshness") but only 1, could use 2-3
U20 first 30 seconds           n/a     -    adv    (Component article - advisory, not written; acceptable but lowers score slightly)
V1 numeric claim verification  8/10    2    gate   Redis ~0.3ms / DB ~5-15ms checked - plausible order of magnitude, minor: DB figure optimistic for cross-region
R4 hub-shaped signal           -       -    adv    not R4: leftover is one mechanism; JWT/OAuth/MFA are R8 extracts (rule A)
R5 scenario-bank overweight    7/10   0.5   adv    Scenario Bank + Probes = ~22% of article - proportionate, mechanics sections carry real depth
V9 cross-article consistency   9/10    1    gate   checked against all 6 other components/*.md siblings - no contradicting definitions, comparison rows, or numeric claims found
V10 at-scale + probe accuracy  8/10   0.5   adv    ring-imbalance claim checked - order of magnitude right for consistent hashing; both probe answers factually sound
--------------------------------------------------------------------------------

GATE: NO-SHIP - 6 gated params below 9 (R1, U16, U22, U15, U21, R8).

BLOCKERS (gated, score ≤8 - fix before publish):
- R1: consolidate stateful-vs-stateless into one place (recommend the Decision Framework table at L195); replace the Quick Decision Guide's inline restatement with a link back to it
- U16: collapse all 12 per-H2 Interview Lens blocks into one `## Interview Scenario Bank` section near the end, keeping only the 4-6 highest-value questions; fold the standalone `## What the Interviewer Probes For` section's content into that same section's `Next question:` fields, then delete the standalone heading
- U22: rewrite the 4 reworded-duplicate Next-question fields as genuine follow-ups to the design choice already made, not restatements of their own Q:
- U15: Token Revocation Strategies restates Revocation Gap - keep one, link the other
- U21: add stampede/invalidation on this page or intro+link to the sibling that owns it
- R8: extract JWT internals to jwt.md; leave intro + link; same for any other sibling taught at full depth (hub only if 2+ mechanisms still remain here)

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
# Articles over the soft length ceiling - candidates for R1/R2/R4 review (cheatsheets and paths are a different kind, exempt from this ceiling)
find content/system-design -name '*.md' ! -path '*/cheatsheets/*' ! -path '*/paths/*' -exec wc -l {} \; | awk '$1 > 900'

# Interview Lens blocks that appear before/without a ## Interview Scenario Bank heading (U16 violation signal)
# NOTE: a file with 2+ Interview Lens blocks INSIDE one Scenario Bank section is correct per spec (3-6+ entries expected) -
# do not flag on raw count. This checks placement (outside/before the heading), not count.
# Uses `find` rather than a `**` glob (needs bash's globstar shopt, not guaranteed on in every shell).
find content/system-design -name '*.md' | while read -r f; do
  awk -v fname="$f" '
    /^## Interview Scenario Bank/ { bank=1 }
    /🎯 \*\*Interview Lens\*\*/ { if (!bank) print fname": lens block at line "NR" appears before/without an Interview Scenario Bank heading" }
  ' "$f"
done

# Components/Algorithms/HLD/DevOps missing a consolidated Interview Scenario Bank
grep -rL 'Interview Scenario Bank' content/system-design/components/*.md content/system-design/algorithms/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# Articles missing a Production Failure Modes summary (U12)
grep -rL 'Production Failure Modes' content/system-design/components/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# Articles still carrying a standalone Interviewer Probes section - U16 violation, should be folded into Interview Scenario Bank
grep -rl 'What the Interviewer Probes For' content/system-design/components/*.md content/system-design/algorithms/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# Articles carrying a Post-mortem/Further-Reading style section - not in spec, cut on sight
grep -rli 'Post-mortem Reading List\|## Further Reading' content/system-design/components/*.md content/system-design/algorithms/*.md content/system-design/hld/*.md content/system-design/devops-tools/*.md

# HLD articles missing the First 30 seconds framing script (U20 - gated for HLD)
grep -rL 'First 30 [Ss]econds\|30-[Ss]econd' content/system-design/hld/*.md

# HLD articles missing a Trade-off Summary (HL6)
grep -rL 'Trade-off Summary' content/system-design/hld/*.md
```

These don't gate any article individually - they help prioritize which existing articles (like the known-bloated `authentication.md`, `caching.md`, `load-balancer.md`) to re-rate and trim/split next.
