# SD Writer - Components

Category file for **Component** articles (`content/system-design/components/**/*.md`). Read [sd-writer.md](./sd-writer.md) first (article-kind detection, universal params, NEVER, format conventions, callouts, topic boundary) - this file adds only what's specific to Components.

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

## Headings list

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

---

## Suggested section starting points

Pick, merge, and reorder based on the topic. Omit inapplicable sections - never include empty placeholders.

Quick Decision Guide (after mechanics) · Conceptual Foundations & Mental Models (optional - see NEVER on symmetric depth; skip if it would just restate the TLDR) · Core Mechanisms · Resilience & Failure Handling · Security & Hardening · Performance & Optimization · Deployment Contexts · Observability & Debugging · Production Failure Modes & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

---

## Self-check addition

No category-specific self-check bullet beyond the shared list in [sd-writer.md § Self-check](./sd-writer.md#self-check).
