# AI Instructions - Interview Scenario Bank Sub-Pages

> **Read `ai-instructions/_base.md` first.** This file defines the format and generation rules for
> `[parent-topic]-interview-scenarios.md` sub-pages, referenced from `components.md`, `algorithms.md`,
> and `hld.md` as the "Interview Scenario Bank" deep-dive link.

---

## WHEN THIS FILE APPLIES

The parent article (component, algorithm, or HLD page) has an "Interview Scenario Bank" bullet in its
index that has grown beyond a 2-3 sentence teaser and needs its own sub-page, per the stub-page rule
in `components.md` / `algorithms.md` / `hld.md` → Scope Management. Use this file once that sub-page
is being generated for real (not for writing the stub placeholder itself).

---

## NEVER

In addition to the shared NEVER rules in `_base.md`:

- Repeat mechanics already covered in the parent article - link back instead of re-explaining
- Invent named companies, real incidents, or real outage postmortems - keep scenarios generic
- Write a scenario that has only one valid answer - every scenario must support a trade-off discussion

---

## GOALS & AUDIENCE

- **Goal:** Interview rehearsal - whiteboard walkthroughs, debugging exercises, scaling curveballs,
  follow-up question trees, drawn from the parent topic.
- **Persona:** Senior interviewer running a mock system design or coding interview.
- **Audience:** Reader has already read the parent page. This page assumes that context - no
  re-introduction of mechanics.

---

## FILE NAMING CONVENTION

- `[parent-topic]-interview-scenarios.md`, same directory as the parent page.
- Title: `# [Parent Topic] - Interview Scenarios`

---

## PAGE STRUCTURE (FIXED - ALWAYS IN THIS ORDER)

1. **Title** - `# [Parent Topic] - Interview Scenarios`
2. **Back-link** - `**[← Parent Topic](./parent-topic.md)**` as the first line under the title.
3. **Table of Contents** - flat linked list of all scenarios by name.
4. Scenarios follow, one H2 per scenario.

---

## SCENARIO FORMAT (FIXED ENVELOPE)

Each scenario is one H2, in this order:

1. **Prompt** - the interview question exactly as an interviewer would say it. One paragraph, no
   preamble.
2. **Clarifying Questions** - bulleted list of the questions a strong candidate asks before designing
   anything.
3. **Walkthrough** - the whiteboard-level design path: assumptions -> approach -> trade-offs. Use the
   parent article's mechanics by reference (`[link back](./parent.md)`), don't re-derive them.
4. **Curveball** - one follow-up twist the interviewer throws once the base design stands (scale
   change, a failure injected, a new constraint). Forces a design revision, not a restart.
5. **Common Trap** - the most frequent wrong turn candidates take on this scenario.
6. **Follow-Up Tree** - 2-4 short follow-up questions an interviewer asks next, depending on how the
   candidate handled the Curveball.

---

## SCENARIO CATEGORIES

Pick a mix across these when populating the bank - don't generate every category for every topic,
only the ones that fit:

| Category               | What it exercises                                                |
| ----------------------- | ------------------------------------------------------------------ |
| Whiteboard walkthrough  | End-to-end design from a blank prompt, same shape as a real interview opener |
| Debugging exercise      | Given a broken/degraded system, find the root cause using the parent topic's failure modes |
| Scaling curveball       | Base design given, then load/scale multiplied by 10-100x mid-interview |
| Trade-off defense       | Candidate must justify a specific design choice against a named alternative |

---

## CONTENT GENERATION SPECIFICATIONS

### Code / Diagrams

Same rules as the parent article type (`components.md` / `algorithms.md` / `hld.md`) - short
pseudocode or ASCII/mermaid only where spatial or logical structure needs it. No full implementations.

### Inline Links

Every reference to parent-topic mechanics links back to the specific section in the parent page
rather than re-explaining. First reference per scenario is enough - don't re-link on every mention.

### Length

Each scenario is self-contained but terse - whiteboard-session length, not essay length. If a
Walkthrough needs more than ~200 words to state the approach, the scenario is scoped too broadly;
split it or trim the ambition of the prompt.

---

## SCOPE MANAGEMENT

- 4-8 scenarios per sub-page is the target range. Fewer than 4 isn't worth a dedicated page (keep it
  inline in the parent instead, per the parent type's stub-page threshold). More than 8 - split by
  category into further sub-pages only if the parent topic is genuinely that broad (e.g., a system as
  wide as "Design Twitter").
- Don't duplicate a scenario that's essentially the same walkthrough as another with a reskinned
  prompt - each scenario must exercise a distinct trade-off or failure mode.

---

## SELF-CHECK

### Before outputting the index, verify:

- [ ] Every scenario title is a crisp phrase naming the situation, not the topic (e.g., "Consumer Lag
      Cascade", not "Message Queue Scenario 3")?
- [ ] Categories are mixed, not all one type?
- [ ] No scenario is answerable with a single fact lookup - all require a trade-off?

If all true -> output index -> STOP. Wait for user confirmation.

### Before outputting each scenario:

- **Whiteboard test:** Could an interviewer read the Prompt aloud verbatim and have it make sense
  cold, with no other context? If not, rewrite.
- **Curveball test:** Does the Curveball force a genuine revision of the Walkthrough's design, not
  just an additional feature bolted on? If not, pick a sharper twist.
- **No-rederivation test:** Does the Walkthrough re-explain parent-article mechanics instead of
  linking to them? If so, cut and link.
