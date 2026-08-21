# SD Writer - HLD (System Design)

Category file for **HLD** articles (`content/system-design/hld/**/*.md`). Read [sd-writer.md](./sd-writer.md) first (article-kind detection, universal params, NEVER, format conventions, callouts, topic boundary) - this file adds only what's specific to HLD.

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

## Headings list

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

---

## Suggested section starting points

Pick, merge, and reorder based on the topic. Omit inapplicable sections - never include empty placeholders.

Requirements & Scope (HL2 - NFR trade-offs resolved, not just listed) · Capacity Estimation · High-Level Architecture · Data Model & Storage · Core Service Design · Reliability & Fault Tolerance · Scalability & Performance · Deep-Dive: [Most Interview-Critical Subsystem] · Observability · Trade-off Summary · Common Interview Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening framing script - gated for HLD) · Appendices

---

## Self-check addition

No category-specific self-check bullet beyond the shared list in [sd-writer.md § Self-check](./sd-writer.md#self-check) (U20 framing-script check there is gated for HLD).
