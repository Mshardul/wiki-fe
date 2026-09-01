# Interview Mode — Content Strategy (STUB)

**Status:** Stub. Placeholder for a full spec to be written after the Next.js migration.
**Date:** 2026-08-31
**Relationship to other work:** Depends on `nextjs-migration-design.md` shipping first (needs the component model, real routing, and build-time content pipeline). Not part of the migration pass.

---

## Why this is only a stub

The migration is the current focus. Interview mode is a large content-strategy effort in its own right and designing it now — before the new stack exists and before we've felt out the extraction work on real articles — would be speculative. This file records the decisions already made so the eventual full spec starts from a known position.

---

## What interview mode is

A dedicated surface holding **everything a candidate needs to walk into an interview** and nothing they don't: definitions, the numbers to know, the trade-offs, the questions that get asked, competitive-programming problems, the spoken soundbites. It is the interview cut of the knowledge base.

The existing deep-dive articles (System Design, DSA) stay as they are — they serve a different goal ("learn the tool deeply", "contest-ready"). Interview mode is a **separate, tighter surface** built from them.

## Decisions locked

- **Not 1:1 with existing articles.** Pages are shaped around the interview (e.g. "design a rate limiter" pulls from several deep-dives), not around the taxonomy.
- **Built by extraction, not fresh authoring.** Interview pages lift the interview-load-bearing passages from the deep-dives (TLDR, mental model, the core trade-off, "what the interviewer probes for", scenario bank, soundbite) and tighten them. They do not re-explain concepts in new words — they cite back to the deep-dive for "go deeper".
- **The root problem is the writer spec, not the articles.** Current `sd-writer` / `dsa-writer` goals target the *union* of interview-prep and course/operator/contest knowledge, and the raters reward operator depth. Interview mode gets its own leaner writer + rater.
- **Surface placement:** a new content vertical now (`content/interview/`, its own `WIKIS`-style entry, `/interview/...` routes). When quiz mode lands, "mode" becomes a first-class routing axis and this is revisited — but that refactor waits until there are two mode-shaped things to generalise from.
- **Provenance tracking:** each interview page declares its source articles so staleness is checkable when a source deep-dive changes (the per-file `CHANGELOG.md` discipline already exists to support this).
- **Contributions:** git-authored markdown, same as the rest of the wiki. No in-app CMS until Shape C forces it.

## Open questions for the full spec

- **Page unit.** Interview questions ("design X")? Concepts-as-asked ("consistency & replication, interview depth")? Both tiers? This decision cascades into everything else.
- **DSA treatment.** Does DSA get its own interview pages, or is DSA content already close enough that it just needs in-place trimming (its excess is narrow — the CP-primitives sections)? System Design carries more pure-operator weight and is the clearer candidate for extraction.
- **Length ceiling + fixed section shape** for an interview page.
- **Extraction rules:** what qualifies as interview-load-bearing; what is always cut (operator runbooks, vendor internals, exotic CP primitives); how much rewriting/tightening vs verbatim lift is allowed.
- **The leaner rater:** gate criteria for "tight, in-scope, correct, well-sourced".
- **Quiz mode coupling:** interview pages should be structured so MCQ questions can be generated from them (from the "what the interviewer probes for" / scenario material). Quiz mode itself is a later, separate effort.

## Not in scope ever (for this stub or its full spec)

Quiz mode implementation, spaced repetition, mock-interview timing, flashcards — related future features, each their own effort.
