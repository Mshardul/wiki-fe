# SD Writer - DevOps Tools

Category file for **DevOps tool** articles (`content/system-design/devops-tools/**/*.md`, excluding `cheatsheets/`). Read [sd-writer.md](./sd-writer.md) first (article-kind detection, universal params, NEVER, format conventions, callouts, topic boundary) - this file adds only what's specific to DevOps tools.

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

## Headings list

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

## Suggested section starting points

Pick, merge, and reorder based on the topic. Omit inapplicable sections - never include empty placeholders.

Architecture Overview & Mental Model · Core Primitives & Abstractions · Internals Deep-Dive · Configuration Model & Patterns · Networking & Communication · Storage & Persistence · Security Model & Hardening · Observability & Debugging · Integration with Other Tools · Scaling & Performance · Production Failure Modes & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

---

## Self-check addition

- **Snippet whiteboard test + cheatsheet boundary check (DV2/DV3):** would you sketch this on a whiteboard? Does this section contain command lists or step-by-step procedures that belong in the cheatsheet instead?
