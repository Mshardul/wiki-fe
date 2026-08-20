# System Design Article Writer

The **source of truth** for writing a system design article (`content/system-design/**/*.md`). Given a topic, this file tells you what to write, in what shape, and in what order. Replaces `_base.md` + `components.md` + `algorithms.md` + `hld.md` + `devops-tools.md` + `devops-cheatsheets.md` - those six files are superseded by this one and [sd-rater.md](./sd-rater.md).

**Purpose: make the reader interview-ready** - the mental model, the mechanics, and the trade-off reasoning a senior needs to defend this topic. Completeness is required **inside** this named mechanism and forbidden **across** sibling topics (see [Topic boundary](#topic-boundary-owns-vs-does-not-own)). The bar is "could a candidate walk into a system design interview with this page (plus linked siblings that own extracted facets) and defend every decision **on this topic**?" Passing [sd-rater.md](./sd-rater.md) is the _check_ that you hit that bar - not the goal itself.

This file **owns the rules**. The rater scores against the param IDs defined here (U1, CO2, AL3, HL5, …); it does not redefine them. If a rule changes, change it here.

Companion files:

- [sd-rater.md](./sd-rater.md) - scores a finished draft against these params, checks for redundancy/bloat, and gates ship / no-ship.
- [scripts/sd-check.sh](../../../scripts/sd-check.sh) - deterministic check for U8 / U9.

---

## Article kinds - specific vs hub vs cheatsheet

Before anything else, decide which **kind** of article you're writing. The kind decides whether the structure below is mandatory.

- **Specific article** - covers **one** component, algorithm/concept, system (HLD), or DevOps tool. This is the default and the overwhelming majority. A specific article **must** follow its section's full structure: every universal param, the section block, the ordered headings. The rater scores it against all of them and gates on the structure being present. Everything else in this file is written for specific articles.

- **Hub article** - covers a **family or cluster** of related topics that each deserve (or already have) their own specific page, and exists to _survey and route_, not to teach any one of them in depth (an `authentication.md`-shaped page surveying session-based / JWT / OAuth / MFA would be a hub if each mechanism has its own deep-dive page). A hub is a **decision layer**: what the family is, the shared theory, a comparison table, "which one when", and a **linked list of its members** with a 2-3 sentence description each. It **does not** trace any single mechanism's full mechanics, gotchas, and interview scenario bank in depth - those live on the member pages.

    **Mark a hub explicitly.** The first thing under the title (after Prerequisites/TOC) must be a blockquote declaring it: `> **Hub article.** This page is the survey + decision layer for <family> - it does not trace any single <member> in depth. Each <member> has its own page …`. This is the signal the rater keys on; an unmarked article is treated as specific and scored against the full structure.

    **A hub still owns:** U7/U8/U9/U10/U11 (format spine, title↔filename, prerequisites, TOC, working links), U1 (what the family is + mental model), a member list with one working link per member (or plain-text name until the member page exists - never a broken `.md` link), and any genuinely family-level content (the comparison table, the shared theory, the "which one when" prose, a Quick Decision Guide routing to the right member). It is judged on _those_, not on the per-member depth params.

    **When to split into a hub + members vs. one specific article:** follow [Topic boundary](#topic-boundary-owns-vs-does-not-own) **rule A**. Extract one ballooned sibling first; the parent stays specific. Convert the parent to a hub **only if**, after extract, this page would still teach **two or more genuinely different mechanisms** at full interview depth (an "Authentication" page that fully teaches session mechanics, JWT internals, all four OAuth grant types, AND MFA is a family). If one mechanism with variants covers it (a single OAuth grant type with its edge cases), it stays one specific article. Do not "fix" length by trimming in-scope senior material, and do not convert to a hub merely because the page is long.

- **Cheatsheet article** - a lookup table or fast-recall reference for a DevOps tool's commands/flags, distinct from the tool's conceptual article. Lives in `content/system-design/devops-tools/cheatsheets/`. It is **not** a specific conceptual article (no mental model, no mechanics, no interview scenario bank) and is **not scored against CO/AL/HL/DV section params**. It exists to serve a different reading mode: on-call/interview fast recall in under 10 seconds, not learning.

    **Mark a cheatsheet explicitly.** No marker blockquote needed - detection is by path (`devops-tools/cheatsheets/**`) and by structure (companion-article link under the title, command tables, no TLDR/Prerequisites in the DS7 sense).

    **A cheatsheet owns:** its own self-contained format (below) and nothing from the universal params except filename convention and working links. It is exempt from mental model, mechanics, callouts (Interview Lens/Decision Framework/Thought Process), diagrams, and interview scenario bank.

    **Cheatsheet format (fixed):**
    1. **Title** - `# [Tool Name] Cheatsheet`
    2. **One-line description** - what this covers, who it's for. No TLDR, no Prerequisites section.
    3. **Companion article link** - `> 📖 Conceptual deep-dive: **[Tool Name](../tool-name.md)**`
    4. **Sections grouped by workflow, not by command name** (e.g. "Images", "Containers", "Debugging" - not "docker run variants"). Each section is a command table: `| Command | Purpose | Notes |`. Notes column: one short phrase, empty is better than padding. Commands sorted by frequency of use, not alphabetically. Destructive commands get their own row with ⚠️ in Notes.
    5. **Quick Reference Tables** (optional) - condensed flag/exit-code/config-key tables at the end.
    - Two callouts only: ⚠️ **Gotcha** (non-obvious/destructive behavior, one line) and 💡 **Tip** (non-obvious shortcut, one line). No Interview Lens, no Decision Framework, no Thought Process.
    - Max 3 sections before the most-used commands appear. No prose paragraph longer than one line per command. No duplicate commands across sections unless context materially changes the meaning. Every command copy-paste ready with safe placeholders (see [Placeholder conventions](#placeholder-conventions)).
    - **Rater treatment:** run only filename convention + working-links + the cheatsheet self-check below. All conceptual params are n/a with justification "cheatsheet article". Gate = SHIP if the self-check passes and every command is copy-paste ready.

- **Path article** - a curated, ordered learning sequence across multiple existing articles (e.g. `paths/hld-interview-loop.md`), not a topic in itself. Lives in `content/system-design/paths/`. It teaches nothing directly - it routes, in order, with a stated reason for the sequence. It is **not scored against CO/AL/HL/DV section params** and has no mental model, no mechanics, no interview scenario bank of its own - all of that lives on the linked articles.

    **No marker blockquote needed** - detection is by path (`system-design/paths/**`).

    **A path owns:** its own self-contained format (below) and, from the universal params, only U8 (filename convention) and U9 (working links - every row's link must resolve to a real file; a not-yet-written target stays plain text, never a broken `.md` link).

    **Path format (fixed):**
    1. **Title** - `# Learning Path: [Track Name]`
    2. **One-paragraph scope line** - what the track covers, its target bar (standard-loop vs senior-depth etc.), and a rough duration estimate (e.g. "~6-8 weeks at a steady pace"). No TLDR, no Prerequisites section, no TOC.
    3. **Cross-link to sibling tracks** - `See [SD Learning Paths](../index.md#learning-paths) for the other tracks.`
    4. **`## Path`** - a single table, columns `Stage | Topic | Type (optional) | Notes`. `Stage` groups topics studied together (repeatable across rows, ascending order). `Topic` is a working link to the real article. `Type` names the source folder (Algorithm/Component/HLD) when the track mixes folders - omit the column if every row is the same type. `Notes` is optional, one short phrase (warm-up, capstone, "revisited at depth") - empty is better than padding.
    5. **`## Explicitly skipped in this track`** - one short paragraph naming what's deliberately out of scope and, where relevant, which sibling track covers it instead.
    - No callouts, no diagrams, no code blocks - a path is a route, not content.
    - **Rater treatment:** run only U8 (filename), U9 (links resolve - every `Topic` cell), and the path self-check below. All conceptual/section-block params are n/a with justification "path article - routes to member content, teaches nothing directly". Gate = SHIP if every linked topic resolves (or is plain-text pending), stages are in ascending order, and the skipped-scope section names a real reason or sibling track.

---

## How to write one

1. **Pick section + family.** Section from the target folder; family from the tables below.
   - `content/system-design/components/…` → **Component**
   - `content/system-design/algorithms/…` → **Algorithm/Concept**
   - `content/system-design/hld/…` → **HLD**
   - `content/system-design/devops-tools/…` (not `cheatsheets/`) → **DevOps tool**
   - `content/system-design/devops-tools/cheatsheets/…` → **Cheatsheet** (self-contained format above, skip the rest of this file)
   - `content/system-design/paths/…` → **Path** (self-contained format above, skip the rest of this file)
2. **Create the file.** Create a new `.md` file at the target path (lowercase, hyphen-separated slug). Write from scratch using the **Headings list** for your section (at the bottom of this file) as a starting menu, not a mandatory fixed order - see [Structure guidelines](#structure-guidelines).
3. **PHASE 0 (HLD only).** Before writing the index, complete this sentence internally: _"The core architectural challenge of [System] is ___."_ Let that thesis drive which section gets the deepest nesting, and ensure it appears explicitly in the TLDR.
4. **PHASE 1 - index only.** Generate ONLY the index (plain text, hierarchical dashes, no markdown code blocks - see [Index format rules](#index-format-rules)). Stop. Wait for user confirmation.
5. **PHASE 2 - content, one section at a time.** Upon "Proceed", generate one H2 section per response, stop, wait for "Continue". Resolve `(→ filename.md)` markers into real inline links when the concept first appears.
6. **Fill every param.** Apply universal params + the section block for your type. Each param below says exactly what "present at interview depth" means.
7. **Write, then rate independently - never self-rate.** The agent/process that wrote the draft must not also grade it - that context is invested in its own choices and reads its own work generously. Once the draft exists, a **separate process with no memory of why any decision in the draft was made** reads [sd-rater.md](./sd-rater.md) and rates the file cold, producing the actual score table in [sd-rater.md's output format](./sd-rater.md#output-format) - not a summary, not "looks good," the real per-param table with every row. In an agentic session, this means spawning a fresh Agent for the rating pass rather than rating in the same context that wrote it (see `.prompts/fe-write-content.md` in the root wiki repo for the reference flow). Show this table. Fix every **blocker** (gated param scoring ≤8), then re-rate with **another fresh, independent process** - not the same one that produced the prior verdict, and not the writer that just fixed it - showing the updated table each pass. Do not hand off a draft that reads NO-SHIP, and do not declare SHIP without having displayed the table that says so - an unshown rate is unverifiable and does not count as having been done. Iterate write-fix → independent-rate until SHIP.
8. **Run the filesystem check** before declaring done: `../../../scripts/sd-check.sh <article.md>` - fix any U8/U9 FAIL.
9. **Register in the index - first draft only.** A new article is invisible to the app until it's listed in `content/system-design/index.md`. First time only - skip on revisions.

---

## NEVER (all article types)

- Start a section with "In this section, we will…" or "This page covers…"
- Define a term inline if it has its own linked page - link it instead
- Generate symmetric section depth - depth must reflect complexity, not balance
- Use "important", "note that", or "it is worth mentioning" as padding
- Repeat the Interviewer TL;DR verbatim in the Key Takeaway
- Open with history or evolution of the topic
- State unverified facts, statistics, or attributions - when uncertain, qualify with "typically" or "commonly" rather than asserting as fact
- Include a "Post-mortem Reading List", "Further Reading", or any external-links-as-homework section - not interview-actionable, not part of the mandatory spine, and not in any Suggested section starting points list. If it exists in an article being edited, cut it.
- Write a separate `## What the Interviewer Probes For` section - follow-up probes live inside `## Interview Scenario Bank` as `Next question:` fields (see U16 below). A standalone probes section outside the bank is a structure violation.
- Include full function or class implementations in code blocks - pseudocode or prose only; full implementations belong in dedicated pages
- Use standards-body URNs, IANA identifiers, or proprietary strings in examples - use simple readable placeholders instead
- **Restate the same comparison, table, or trade-off in more than one section** - see U14 below. If two sections both want to explain stateful-vs-stateless (or any X-vs-Y), one states it in full and the other links back to it.
- **Fully teach an adjacent extractable sibling** (full mechanics / gotchas / scenario bank) on this page - intro + link only; the sibling owns the depth (U21/R8).
- **Invent a syllabus** beyond this filename's mechanism - owns is senior facets of *this* topic, not everything a related encyclopedia page would include.
- **Add a `## Scope` heading or owns/does-not-own lists to article files** - that contract lives in this file and the rater only.
- **(DevOps only)** Include full production-grade configs or scripts, real hostnames/IPs/secrets, or duplicate content that belongs in the companion cheatsheet.
- **(Algorithms/Concepts only)** Include formal notation, ε-δ proofs, or full inductive proofs.

---

## Format conventions (every specific article)

- Open `# Title` → `## Prerequisites` → `## Table of Contents` → `## TLDR` → body → (HLD only: `## Trade-off Summary`) → `## Appendices`. **No YAML front matter.**
- Filenames: lowercase, hyphen-separated, `.md`.
- H1 title conventions per type: Component/Algorithm/DevOps-tool → `# [Name]`; HLD → `# Design: [System Name]`.
- Prerequisites: `**[Name](relative-link)** [Must read]` or `**[Name](relative-link)** [Should read]` - name and tier only, no description sentence. For a not-yet-written target, use `<!-- link: file.md -->` immediately after. Tier is exactly one of these two values - never invent a third (`[Recommended]`, `[Nice to have]`).
  - ✅ `**[Caching](../components/caching.md)** [Must read]`
  - ❌ `**[Caching](../components/caching.md)** [Must read] - CDN edge nodes are caching layers; TTL mechanics directly determine the staleness behaviour covered throughout this page.`
- Cross-vertical links allowed and encouraged (e.g. an HLD page → a DSA data-structure page). Every live `.md` link must resolve to a real file.
- **Diagrams are real, never placeholders.** Plain ASCII or mermaid. Mandatory wherever spatial relationships or state transitions are core to understanding (a hashing ring, a request pipeline, a control-plane topology). A `<!-- diagram -->` TODO does not count.
- **TLDR:** up to 5 sentences (≤50 words for Component/Algorithm/HLD, ≤60 for DevOps), plain prose, no bullets. What it is, the core decision/insight it enables, and the key trade-off. Self-contained - never "this page covers…".
- **Code & config:** fenced blocks for config patterns, API contracts, schema design, CLI diagnostics, or pseudocode where logic sticks faster than prose. No full implementations. Always ask: would this be on a whiteboard in the interview? If not, cut it.

### Inline links - path conventions

From any specific article, relative to its own folder:

- Same directory: `./file.md`
- Components: `../components/file.md`
- Algorithms/concepts: `../algorithms/file.md`
- HLD pages: `../hld/file.md`
- DevOps tools: `../devops-tools/file.md`; that tool's cheatsheet: `../devops-tools/cheatsheets/file.md`
- Cross-vertical (e.g. into DSA): full relative path, e.g. `../../dsa/data-structures/hash-table.md`

### Placeholder conventions

Never use real hostnames, IPs, credentials, tokens, or standards-body identifiers. Use: `app.example.com`, `my-service`, `my-namespace`, `10.0.0.0/16`, `registry.example.com`, `acr=basic` (not real IANA/URN strings). Ports: `8080` (host), `80` (container). Git: `feature/my-branch`, `origin`.

---

## Index format rules

- Plain text only. NO markdown code blocks, NO fenced sections.
- Hierarchical dashes: each depth level indented 4 spaces, no numbers, no fixed depth limit.
- Short, crisp phrases only - no sentences, no explanations.
- Zero fluff, zero basic definitions. Content follows progressive disclosure.
- No cross-references like "see the section above."
- Acronyms free in index. Full definitions in Appendices → Acronyms only.
- Vendor-specific implementations: keep bullet generic. Examples belong in content only.
- When a concept has its own page, append `(→ filename.md)` as a reminder to inline-link during content generation.

✅ `- L4 vs L7 - routing granularity trade-offs` · ✅ ` - Split-brain - quorum, fencing`
❌ `- Overview of what load balancers do and why they are needed` · ❌ ` - Discussion of various failure modes and how to handle them`

---

## Heading style rules

- **Concept H3s:** clean name only, no trailing description. H4 for sub-concepts.
- **Failure-mode H3s:** a dash is acceptable when the mitigation is integral to naming the pattern (`### Split-Brain - Quorum, Fencing`).
- No heading-as-sentence. Headings are crisp noun phrases.

✅ `### LRU (Least Recently Used)` with `#### Mechanics` / `#### Scan Resistance Problem` below · ❌ `### LRU - Mechanics, Scan Resistance Problem`

---

## Universal params - every specific article

| #   | Param                              | What to write |
| --- | ----------------------------------- | -------------- |
| U1  | Mental model + one-line definition | Define through purpose and first principle, not dictionary style. One intuitive one-liner (analogy, comparison, or bolded compression) before mechanics. |
| U2  | Prerequisites format                | Per [Format conventions](#format-conventions-every-specific-article). At least one prerequisite must be a genuine concept dependency, not topical adjacency. |
| U3  | TOC present                         | `## Table of Contents`, flat linked list of all H2 sections, immediately after Prerequisites. |
| U4  | TLDR                                 | Per [Format conventions](#format-conventions-every-specific-article). Must pass the flashcard test (see Self-check). |
| U5  | Diagrams                             | Real mermaid/ASCII wherever spatial relationships or state transitions are core. Diagram must match the prose walkthrough exactly - same components/steps/values, same order. |
| U6  | Tables for multi-dimension comparisons | Markdown tables for X-vs-Y trade-offs, feature matrices, decision criteria. ≤4 columns. Prefer tables over prose for any comparison with 3+ dimensions. |
| U7  | Format spine                        | Title → Prerequisites → TOC → TLDR → body → Appendices (HLD adds Trade-off Summary before Appendices). No YAML. |
| U8  | Filename convention                 | Lowercase, hyphen-separated, `.md`, matching the naming convention for its type. |
| U9  | Links resolve                       | Every `[text](./path.md)` link points to a real file, cross-vertical included. |
| U10 | Interview soundbite                 | One memorable sentence a candidate can say out loud to compress the whole article (e.g. "A load balancer's real decision isn't L4-vs-L7, it's how fast you can detect and route around a dead backend."). Place at the end of the TLDR or as the article's Key Takeaway equivalent. |
| U11 | Callouts used correctly             | Per [Callouts](#callouts). No numeric cap on any callout type - use as many as genuinely serve clarity. Warning/Gotcha: genuinely non-obvious only, not a inserted for count. Thought Process only where reasoning is non-obvious. Decision Framework only for real X-vs-Y trade-offs. |
| U12 | Failure modes - two-level pattern   | Failure modes appear inline as H3s within their relevant parent H2 **and** are consolidated in one dedicated summary H2 (`## Production Failure Modes & Gotchas`). Always present. Primary interview revision target. |
| U13 | Vendor examples                     | Core explanation stays generic. Mention 1-2 well-known real implementations as examples, no deep comparison, no proprietary internals. |
| U14 | No duplicate content across sections (gated) | Every comparison, table, or trade-off explanation appears **fully stated exactly once** in the article. If a second section needs it, it links back (`see [Stateful vs Stateless](#stateful-vs-stateless)`) rather than re-explaining. This is the single highest-leverage anti-bloat rule - **check it explicitly before publishing**: list every X-vs-Y comparison in the draft and confirm each appears in exactly one place. |
| U15 | Section length proportionality (gated) | Depth follows conceptual complexity of **this topic**. Completeness is required inside the topic ([U21](#universal-params---every-specific-article)) and forbidden across sibling topics (R8 in the rater). Length is a *why* check: restatement (U14) vs nested depth of one mechanism (fine) vs a sub-concept that belongs on its own page (see [Topic boundary](#topic-boundary-owns-vs-does-not-own)). If a single sub-concept consumes more space than the rest of the article combined, extract it - do not pad or cut in-scope senior material to hit a line count. |
| U16 | One consolidated Interview Lens section (gated) | Interview Lens (Q/Ideal answer/Common trap/Next question format) appears **once per article**, as a single dedicated `## Interview Scenario Bank` section near the end, covering the article's 3-6 highest-value opening questions - **not once per H2 section, and not as a second standalone section**. Individual H2 sections may reference "see Interview Scenario Bank" but must not embed their own Q&A block. If a probe doesn't map cleanly onto any single entry, add a short trailing subgroup inside the same section (e.g. `### Additional Probes`) rather than a new top-level H2 - there is no separate `## What the Interviewer Probes For` section. See [NEVER](#never-all-article-types). |
| U22 | Interview Scenario Bank - follow-up probe content | Each entry's `**Next question:**` field(s) carry the follow-up-probe content - a genuine **follow-up after a design choice is made**, probing the choice not the topic ("you chose consistent hashing - what happens when node count doubles overnight?"), distinct in kind from the opening Q&A. Use multiple `**Next question:**` lines per entry when there's more than one genuine follow-up (never cram two questions into one field). |
| U23 | Interview Scenario Bank - Q/probe leak | **Neither the `Q:` field nor a `**Next question:**` field may name the mechanism/technique that answers it** - the reader must produce the answer, not receive it pre-stated in the question (bad: "why does consistent hashing use virtual nodes to fix ring imbalance?"; good: "one node keeps getting 2x the keys of others - what's your fix, and why does it work?"). |
| U17 | Real-world usage + at-scale failure (advisory) | **2-3 sentences**, folded into an existing section (Quick Decision Guide / When to use / vendor-examples area) - no new heading. Name a real system where this is a workhorse (may reuse U13's vendor example), **then go past U13**: one sentence on what actually breaks at scale - the failure mode that only shows up past a real threshold or under production load (consistent hashing's ring imbalance past thousands of nodes; a cache's thundering herd at high QPS on a hot key). This is the bridge a senior candidate walks when asked "how does this hold up 10x bigger?" |
| U19 | Common misconceptions (advisory) | **1-3 bullets**, folded into Production Failure Modes & Gotchas (or a `### Common Misconceptions` sub-heading within it) - no new top-level H2. Each corrects a **wrong mental model**, not an implementation bug: "eventual consistency means data is wrong for a while" (no - it means no staleness bound is guaranteed, could resolve immediately or never under partition), "sharding and partitioning are the same thing" (partitioning is the general concept, sharding is horizontal partitioning across servers specifically), "a load balancer makes a system infinitely scalable" (it distributes load, it doesn't remove the shared-state bottleneck behind it). Distinction from Gotchas: gotchas = "you designed it right but missed this failure mode"; misconceptions = "you reached for this tool with a false belief about what it guarantees." Skip if no genuine misconceptions exist - do not manufacture filler. |
| U20 | First 30 seconds - interview framing script (HLD gated, Component/DevOps advisory) | **2-4 sentences**, placed as the opening of `## Interview Scenario Bank` or immediately before it, marked as a distinct callout/blockquote. The literal script a candidate says out loud in the first 1-2 minutes to frame scope before diving in - not a summary of the article, the actual opening move (e.g. "I'd clarify read/write ratio and consistency requirements first, since that decides SQL vs NoSQL here. Assuming read-heavy and eventual consistency is acceptable, the core challenge becomes..."). For HLD this maps naturally onto scoping the requirements-gathering opening; for Component/DevOps it's the opening framing when the topic comes up as a sub-question inside a larger design. **Gated for HLD** (the framing opener is make-or-break for HLD interviews); **advisory for Component/Algorithm/DevOps**. |
| U21 | In-scope coverage (gated) | Every senior-interview facet of **this filename's mechanism** is on this page, or introduced in 2-3 sentences with a link to the sibling that owns it. Infer owns from the named topic + the matching section block (CO/AL/HL/DV) + follow-ups still about *this* tool - do not invent an encyclopedia syllabus. A hole is a missing facet of this topic with no owning sibling link. HLD pages own the *system's* composition, capacity, and trade-offs; component/algorithm mechanics they use are intro + link (see [Topic boundary](#topic-boundary-owns-vs-does-not-own)). Paths/cheatsheets: n/a. |

---

## Callouts

| Emoji | Name | When to use | Frequency |
| ----- | ---- | ----------- | --------- |
| 🧠 | **Thought Process** | Show how a senior engineer reasons from requirements to a design decision | Where the section involves non-obvious reasoning - not mandatory |
| ⚖️ | **Decision Framework** | X vs Y constraints, trade-off justification, "when would you NOT use this?" | ≥1 per section comparing ≥2 design options |
| ⚠️ | **Warning / Gotcha** | Pitfalls, non-obvious failure modes, assumptions that silently break at scale | No cap - genuinely non-obvious only, never inserted to hit a count |
| 🔧 | **Practical Example** (DevOps only) | Minimal config snippet or command sequence showing the concept in action | 1-2 per H2 where a concrete example materially aids understanding |

**No per-section Interview Lens** (see U16). The consolidated `## Interview Scenario Bank` uses this exact format per entry:

```
> 🎯 **Interview Lens**
> **Q:** [Expected interview question]
> **Ideal answer:** [What a strong candidate says]
> **Common trap:** [The most frequent wrong answer or framing]
> **Next question:** [The follow-up if the candidate answers well]
```

**Multiple follow-ups:** an entry isn't limited to one `**Next question:**` field. If a design choice genuinely opens up 2-3 distinct follow-up directions, write each as its own `**Next question:**` line, one per line, rather than merging them into a single field separated by prose. Never cram two questions into one field (e.g. `**Next question:** "Q1?" → A1. "Q2?" → A2.` is wrong - split into two lines). This applies equally to any "Follow-up(s):" style field elsewhere in an article (e.g. HLD scenario write-ups) - one follow-up per line, singular or plural field name matching the count.

The `**Next question:**` field IS the interviewer-probe content - it is not a stub pointing elsewhere. Write it as a real follow-up ("what happens when node count doubles overnight?"), not a placeholder ("interviewer will probe further").

---

## Length ceiling & when to split

There is no hard word-count cap - depth must still track complexity of **this topic** - but the following are **explicit trim/split signals**, checked at write time and re-checked by the rater:

- **Per-section soft target:** a single H2 section (TLDR-equivalent framing + mechanics + callouts, excluding a dedicated deep-dive that's structurally expected like HLD's Data Model) should rarely exceed **~150-250 lines**. A section past this is very likely restating something (check U14) or covering a sibling that deserves its own page (see [Topic boundary](#topic-boundary-owns-vs-does-not-own)).
- **Per-article soft target:** a specific article covering one component/algorithm/system/tool should land in the **~400-700 line** range at senior depth. An article past **~900 lines** is a strong signal it is actually hub-shaped (covers 2+ genuinely distinct mechanisms) **or** is teaching siblings in-place - see rule A below.
- **The check that actually matters:** not the line count itself, but *why* it's long. A 900-line article that is one deeply-nested mechanism with no repetition can be correct. A 900-line article restating the same trade-off three times is U14. A 900-line article that fully teaches two mechanisms is R4/hub, not a trim.

---

## Topic boundary (owns vs does not own)

This contract lives **only** in this file and [sd-rater.md](./sd-rater.md). **Do not** add a `## Scope` heading or owns/does-not-own lists to article files. The rater infers the split from the filename's mechanism, the body, and links.

**Purpose:** a senior candidate can defend every decision *on this topic* from this page, plus linked siblings that own extracted facets. Adjacent topics are named and linked, not re-taught.

| | On this page | Not on this page |
| --- | --- | --- |
| **Owns** | Senior-interview facets of **this filename's mechanism** (section-block depth + follow-ups still about this tool) | — |
| **Does not own** | Intro (2–3 sentences) + link | Full mechanics / gotchas / scenario bank for an **extractable sibling** (existing `*.md` or a page that should exist) |
| **Refused layers** | Never (see [NEVER](#never-all-article-types)) | Implementations, vendor runbooks, PKI internals, encyclopedia adjacency - these are not "does not own" siblings |

**Do not invent a syllabus.** `caching.md` owns cache problems (TTL, eviction, stampede, invalidation). It does not own CDN or Redis-as-primary-store.

**HLD composition:** an HLD page always names cache, hash, DB, queues, etc. That is in-scope as **intro + link**. Fully teaching any of those (the component/algorithm article's job) is out-of-scope teaching (R8). The HLD owns the system's requirements, capacity, composition, bottleneck, and trade-off log.

**Split rule A:**

1. One sub-concept ballooned or is itself a specific-article topic → extract to a sibling page; parent keeps intro + link; parent stays **specific**.
2. Convert the parent to a **hub** only if, after extract, this page would still teach **2+ distinct mechanisms** at full interview depth.

### Worked examples

**Component - `caching.md`**

| | Example | Why |
| --- | --- | --- |
| Include | Cache-aside vs write-through, TTL, eviction, stampede/hot key, invalidation, what breaks at 10× QPS | These are the decisions a senior defends when the interviewer says "add a cache." |
| Intro + link only | CDN, Redis persistence/cluster, load-balancer algorithms, consistent hashing as a placement scheme | Other components/algorithms; naming the layer is enough. |
| Separate file | `cdn.md`, DB/Redis-as-store if that is the topic, `consistent-hashing.md` | Each is its own interview topic; teaching them here is a second article. |

**Component family - `authentication.md`**

| | Example | Why |
| --- | --- | --- |
| Include (if still specific) | Exactly one remaining mechanism at full depth, plus intro+link to extracted members | Specific = one mechanism. |
| Intro + link only | JWT internals, OAuth grants, MFA, session-store details once those pages exist | Siblings own that depth. |
| Separate file / hub | `jwt.md`, `oauth-oidc.md`, `mfa.md`, `session-auth.md`; parent becomes a hub **only if** it would still fully teach 2+ of these after extract | Family survey + routing is a hub; one leftover mechanism is still a specific page. |

**HLD - `url-shortener.md` (or any Design: page)**

| | Example | Why |
| --- | --- | --- |
| Include | Requirements/NFRs with a stated winner, capacity, where cache/hash/DB sit, the system's bottleneck, trade-off log, 30-second framing | The interview is the *system*, not a component class. |
| Intro + link only | Caching, encoding/hashing, databases, rate limiting | HLD always composes components; those pages own mechanics. |
| Separate file | Do not fork `caching-for-url-shortener.md` - link `caching.md` | One component page; per-system forks duplicate the sibling. |

### Extracting a sibling (stub pages)

When rule A step 1 fires:

1. Create a dedicated file (e.g. `jwt.md`) seeded with the content that was there.
2. Add a prerequisite back-link in the sibling: `**[Parent](./parent.md)** [Must read]`.
3. Add `<!-- Partial article - seeded from parent.md. Sections to be completed. -->` in the stub's TOC.
4. In the parent, replace the deep content with a 2-3 sentence summary + link to the new page.
5. In `index.md`, add the stub as a commented-out row until the article is complete.
6. If the parent still traces **2+ remaining full-depth mechanisms**, convert it to a **hub article** (see [Article kinds](#article-kinds---specific-vs-hub-vs-cheatsheet)).

Don't discard written content - seed it into the appropriate dedicated page.

---

## Section block - Components

Write these in addition to the universal params.

**Goal & audience:** interview prep (trade-offs, debugging, scenario design) + production-grade conceptual mastery. Persona: senior system design educator. Audience: engineers with adjacent knowledge, self-contained article. Approach: progressive disclosure - intuitive mental models → technical mechanics → production trade-offs & interview scenarios.

| #   | Param | What to write |
| --- | ----- | -------------- |
| CO1 | Core mechanics | How the component works internally - the mechanism, not a restated definition (see U14/layering). |
| CO2 | Quick Decision Guide | Placed **after** Core Mechanisms, not before - readers understand trade-offs better once they understand the mechanics. When to use, when not to, how to choose between variants. **Where $ cost genuinely differentiates the options** (managed service vs self-hosted, over-provisioning vs autoscaling, storage tier pricing), name it as one of the deciding factors - not every component has a real cost angle, don't force one. |
| CO3 | Comparison / Selection Matrix | Table comparing this component + real rivals across key dimensions, with a "pick it when…" style takeaway. Only if genuinely multiple meaningful variants exist. |
| CO4 | Resilience & failure handling | How the component fails and degrades, feeding into the consolidated Failure Modes section (U12). |

---

## Section block - Algorithms & Concepts

Write these in addition to the universal params.

**Goal & audience:** interview prep (trade-offs, application to system design, reasoning under constraints) + deep conceptual mastery. Approach: intuition-first - mental model → formal definition → mechanics → variants → real-world application → production trade-offs & interview scenarios.

| #   | Param | What to write |
| --- | ----- | -------------- |
| AL1 | Analogy | For abstract theorems/formal concepts, lead with one concrete real-world analogy before the mental model, mapping directly to the key trade-off - not just the name. ✅ "CAP = a bank branch during a network outage: stop serving customers (CP) or serve with possibly stale balances (AP)." ❌ "CAP is like choosing between different priorities." |
| AL2 | Formal definition | State the formal definition in plain English. If there's a canonical statement, quote then restate plainly. 1 sentence preferred, ≤3 max, ≤30 words, no notation. |
| AL3 | Proof sketch (conditional) | Include **only** when the argument itself is the insight - when knowing _why_ the result holds changes how you design systems (CAP's partition-forces-a-choice argument). Skip when the mechanism matters more than the proof. If included: intuitive only, no formal notation/induction, one paragraph max, framed as "why this must be true." |
| AL4 | Assumptions & preconditions | For theorems/formal concepts: what must be true for this to hold, and what breaks when violated. Distinct from failure modes - these are the concept's own boundary conditions. |
| AL5 | Often confused with | Direct disambiguation for commonly-conflated concepts (CAP vs PACELC, ACID vs BASE), placed after core mechanics, before variants. Table if 3+ dimensions differ. Frame as "X focuses on **_, Y focuses on _**", not as a correction. |
| AL6 | Variants & extensions | Only variants with distinct design implications - not an exhaustive list. Table if 3+ dimensions. Common case first, then extensions/edge cases. |
| AL7 | Complexity & formal properties | Where meaningful (time, space, error bounds, false-positive rates): state bounds plainly in prose or a small table, no derivations, always connect to the practical system-design implication. |

---

## Section block - HLD (system design)

Write these in addition to the universal params.

**Goal & audience:** interview prep (end-to-end walkthrough, trade-offs, scaling decisions, failure modes) + production-grade architectural mastery. Persona: senior system design interviewer.

| #   | Param | What to write |
| --- | ----- | -------------- |
| HL1 | System thesis (PHASE 0) | Before the index: complete "The core architectural challenge of [System] is ___" internally. Drives which section gets the deepest nesting; must appear explicitly in the TLDR. |
| HL2 | Requirements & scope | Functional, non-functional, explicitly out of scope. **Non-functional requirements must carry the trade-off reasoning, not just the list**: for each NFR that conflicts with another (consistency vs availability, latency vs cost), state which one wins **for this specific feature** and one sentence why - not "the system should be highly available and strongly consistent" left unresolved. **Security is a first-class NFR, not an optional add-on** - every HLD article states, at minimum, authn/authz approach (who can call this, how is identity verified) and one sentence on protecting data at rest or in transit where the system handles anything sensitive. Skipping security by default is a junior tell; explicitly scoping it out ("auth is out of scope, assume an upstream gateway handles it") is an acceptable senior move - silence is not. |
| HL3 | Capacity estimation | Fixed order: **DAU → QPS → Storage → Bandwidth**, ending in a stated dominant constraint. Rough is fine (±1 order of magnitude) - the goal is identifying the bottleneck, not precision. Format: `**Users:** ... **Read/Write ratio:** ... **Peak QPS:** ... **Storage:** ... **Bandwidth:** ... **Key constraint:** ...` |
| HL4 | High-level architecture | Component diagram, read path, write path. **At least one of the read/write paths must be a sequence-style diagram** (mermaid `sequenceDiagram` or numbered-arrow ASCII showing caller → component → component → response, in time order) - distinct from the static component-box diagram. A component diagram alone shows what talks to what, not the order of calls, timeouts, or where a request can fail mid-flight - the sequence view is what candidates are actually expected to draw when asked to "walk through what happens when a user does X." |
| HL5 | Data model & storage | Schema, storage engine choice, sharding strategy. |
| HL6 | Trade-off Summary (gated) | Dedicated H2, placed **before Appendices**. A decision log, not prose - one row per major architectural decision: `Decision \| Options Considered \| Choice \| Why (one sentence)`. Only decisions where the rejected option was genuinely reasonable. **Where cost is a real factor in the decision** (over-provisioning vs autoscaling, cross-region replication egress, managed vs self-hosted), name it in the Why cell - a senior answer weighs $ alongside latency/consistency, not just the technical axes. Not every row needs a cost angle; force it only where it's genuinely part of why the rejected option lost. |

---

## Section block - DevOps tools

Write these in addition to the universal params.

**Goal & audience:** conceptual mastery of internals, design decisions, and trade-offs, bridged with practical examples. **Scope boundary: this article explains _why_; the companion cheatsheet covers _how_ (commands). Never replicate command lists here.**

| #   | Param | What to write |
| --- | ----- | -------------- |
| DV1 | Architecture & internals | How the tool actually works under the hood - the mechanism a config file or CLI hides. |
| DV2 | Practical examples (🔧) | Minimal, illustrative snippets only - enough to show the concept, not a working config. Annotate the _why_, not the _what_, inline. Ask: "does this snippet make the concept click faster than prose?" If not, cut it. |
| DV3 | Cheatsheet boundary | Any command list, full flag reference, or step-by-step procedure belongs in the companion cheatsheet, not here - link to it instead of duplicating. |
| DV4 | Key Config Reference (optional appendix) | Only if a config file is central to the tool. Table: `Key/Flag \| Default \| What it controls \| When to change`. ≤10 rows - full reference lives in the cheatsheet. |

---

## Appendices format

Always at the end (HLD: after Trade-off Summary). Include only relevant sub-sections.

- **Acronyms & Abbreviations** - `Acronym | Full Form | One-line meaning`. Scope: only acronyms for concepts directly and substantially covered in this article.
- **Anti-patterns** - bulleted: `pattern name - why it fails - what to do instead.`
- **Selection Matrix** _(only if the topic has multiple meaningful variants worth comparing)_ - table, columns = variants, rows = criteria.
- **Key Config Reference** _(DevOps only, optional)_ - see DV4.

---

## Structure guidelines

- Do not prescribe one fixed section order beyond the mandatory spine (Prerequisites → TOC → TLDR at the top; Failure Modes summary, Interview Scenario Bank, and Appendices near/at the end; HLD adds Trade-off Summary before Appendices). The topic's nature drives everything in between.
- Depth reflects conceptual complexity - the more layered and nuanced a concept, the deeper it nests. Unbalanced tree by design.
- **Interview Scenario Bank is one consolidated section** (per U16), not scattered per-H2 Interview Lens callouts.

### Suggested section starting points

Pick, merge, and reorder based on the topic. Omit inapplicable sections - never include empty placeholders.

**Components:** Quick Decision Guide (after mechanics) · Conceptual Foundations & Mental Models (optional - see NEVER on symmetric depth; skip if it would just restate the TLDR) · Core Mechanisms · Resilience & Failure Handling · Security & Hardening · Performance & Optimization · Deployment Contexts · Observability & Debugging · Production Failure Modes & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

**Algorithms/Concepts:** Mental Model & Intuition · Formal Definition · Assumptions & Preconditions · Core Mechanics · Often Confused With · Variants & Extensions · When This Applies · Real-World Applications · Performance & Complexity · Common Misapplications & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

**HLD:** Requirements & Scope (HL2 - NFR trade-offs resolved, not just listed) · Capacity Estimation · High-Level Architecture · Data Model & Storage · Core Service Design · Reliability & Fault Tolerance · Scalability & Performance · Deep-Dive: [Most Interview-Critical Subsystem] · Observability · Trade-off Summary · Common Interview Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening framing script - gated for HLD) · Appendices

**DevOps tools:** Architecture Overview & Mental Model · Core Primitives & Abstractions · Internals Deep-Dive · Configuration Model & Patterns · Networking & Communication · Storage & Persistence · Security Model & Hardening · Observability & Debugging · Integration with Other Tools · Scaling & Performance · Production Failure Modes & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

---

## Headings list per section

The mandatory spine each article must contain. Sections between TLDR and Failure Modes are chosen from the suggested list above per-topic, not fixed.

### Components

```
# Title
## Prerequisites
## Table of Contents
## TLDR
... (Core Mechanisms, Quick Decision Guide, and other chosen sections - see Suggested section starting points) ...
## Production Failure Modes & Gotchas   (U12 - consolidated, inline H3s elsewhere feed into this; U19 misconceptions fold in as a sub-heading)
## Interview Scenario Bank              (U16/U22/U23 - consolidated Interview Lens entries, 3-6, Next question fields carry follow-up probes, no Q/probe leaks; U20 opening framing script, advisory)
## Appendices
```

### Algorithms & Concepts

```
# Title
## Prerequisites
## Table of Contents
## TLDR
... (Mental Model, Formal Definition, Assumptions, Mechanics, Variants, etc. - see Suggested section starting points) ...
## Common Misapplications & Gotchas    (U19 misconceptions fold in as a sub-heading)
## Interview Scenario Bank             (U20 opening framing script, advisory)
## Appendices
```

### HLD

```
# Design: [System Name]
## Prerequisites
## Table of Contents
## TLDR
... (Requirements, Capacity Estimation, Architecture, Data Model, etc. - see Suggested section starting points) ...
## Production Failure Modes & Gotchas  (U19 misconceptions fold in as a sub-heading)
## Trade-off Summary               (HL6 - decision log, before Appendices)
## Interview Scenario Bank         (U20 opening framing script - GATED for HLD, see U20)
## Appendices
```

### DevOps tools

```
# Title
## Prerequisites
## Table of Contents
## TLDR
... (Architecture, Internals, Config Model, etc. - see Suggested section starting points) ...
## Production Failure Modes & Gotchas  (U19 misconceptions fold in as a sub-heading)
## Interview Scenario Bank             (U20 opening framing script, advisory)
## Appendices                       (may include Key Config Reference)
```

---

## Self-check

### Phase 1 - before outputting the index

- Tree is unbalanced - depth reflects conceptual complexity, not symmetry?
- All index bullets are crisp phrases - no sentences, no definitions?
- Concepts with own pages annotated with `(→ filename.md)`?
- Inapplicable sections omitted - no empty placeholders?
- Index builds progressive complexity toward interview defense?
- HLD only: system thesis (Phase 0) identified and will be reflected in the deepest section?

If all true → output index → STOP. Wait for user confirmation.

### Phase 2 - before outputting each section

- **TLDR flashcard test:** can someone use the TLDR standalone as an interview flashcard? If it says "In this article…" or references other sections - rewrite.
- **Key Takeaway / soundbite sticky-note test:** would a candidate write this on a post-it? If longer than 2 sentences or repeats the TLDR verbatim - compress.
- **Code block whiteboard test:** would you write this on a whiteboard in the interview? If not - cut it.
- **Duplication check (U14):** does this section restate a comparison/table already fully stated elsewhere in the article? If yes - link back instead of re-explaining.
- **Scope check (U15 / U21 / R8):** is this section still *this* mechanism at senior depth, or is it a sibling's full article / an invented syllabus / restatement? If a sibling - intro + link and extract. If a hole in *this* topic - write it here (or link the owner). If length rivals the rest of the article because of a sub-concept - apply [Topic boundary](#topic-boundary-owns-vs-does-not-own) rule A.
- **Probe distinction check (U22):** does each `**Next question:**` field (or trailing probes subgroup) ask a genuine follow-up to a design choice already made, or does it just repeat its own entry's `Q:` in different words? If the latter - rewrite or cut.
- **Q leak check (U23):** does the `Q:` field itself already name the mechanism/technique that answers it, so the reader doesn't have to produce it? ("Why does consistent hashing use virtual nodes to fix ring imbalance?" leaks - "one node keeps getting 2x the keys of others, what's your fix and why does it work?" doesn't.) Same check applies to `**Next question:**` fields - a follow-up phrased around the answer's key term isn't a genuine open probe. If the question pre-states its own answer, rewrite it as a scenario/symptom the reader has to diagnose.
- **Misconception check (U19):** is each bullet a wrong belief about what the tool/pattern guarantees, or is it secretly a gotcha (implementation bug) in disguise? If the latter - move it to Gotchas proper.
- **Framing script check (U20):** would this actually be said out loud in the first 2 minutes of an interview, or does it read like a summary of the article? If the latter - rewrite as a spoken opening move, not a recap.
- Algorithms only - **proof sketch test:** does the proof sketch illuminate a design insight, or is it just formalism? If the latter, cut it.
- DevOps only - **snippet whiteboard test + cheatsheet boundary check:** would you sketch this on a whiteboard? Does this section contain command lists or step-by-step procedures that belong in the cheatsheet instead?

### Path self-check (paths/ only, skip all of the above)

- Every `Topic` cell links to a real file, or is plain text if the target doesn't exist yet - never a broken `.md` link?
- `Stage` numbers are ascending, and rows sharing a stage are genuinely meant to be studied together?
- The scope line states target bar + rough duration, not a restatement of the table?
- `## Explicitly skipped in this track` names a real reason or points to the sibling track that covers it - not left empty or vague?
- No mental model, mechanics, or Q&A content invented for the path itself - it routes, the linked articles teach?
