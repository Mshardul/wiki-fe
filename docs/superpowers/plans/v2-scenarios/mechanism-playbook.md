# Mechanism visualizer — planning playbook

**Priority:** student learning. Every choice (chips, steps, tracing device) is made for what teaches best — not for what already exists in code.

**Frame:** scenario chips + stage + steps + About. Sliders / Try tab / vars strip only if Shardul explicitly approves.

**Topic list:** `content/Visualizer/visualizer-topic-backlog-v2.md`

---

## How we work

1. A **writer** agent drafts the slug doc (template below), in order: concept → steps → tracing device.
2. A **different, fresh reviewer** agent checks it against the plan gate. Ping-pong until it passes.
3. Shardul approves. Nothing is built before that.
4. Throwaway browser mockups with Shardul settle the look of the tracing device.
5. Spec and plan, then the module is built directly in TypeScript, with scenario data as JSON or TS under `lib/visualizer/<slug>/`. No standalone HTML draft and no extract script; see "Building mechanism visualizers" in `docs/_meta/visualizer/README.md`.
6. Implementation follows the approved doc exactly. A **new reviewer** diffs the code against the doc.

One slug at a time unless Shardul says batch.

---

## Planning pass

**Concept.** Title, slug, one-paragraph objective, prereqs if any. 3–4 chips: tab labels; the happy chip poses a **setup** question, broken chips pose a **symptom** question. Per chip: question, target misconception, interview question, aha step number. If both a broken and a fix tab exist, broken comes first.

**Steps.** Per chip, numbered frame outline, one state change per step. Harm shows in step text and the bad strip. Legend words stay consistent with shipped mechanism pages.

**Tracing device.** Whiteboard first: what the student watches on stage, especially at the aha step, and why that is the best way to teach this mechanism. No reference to existing shapes while deciding. After deciding, add one line for the implementer: reuse, extend or new.

---

## Plan gate (reviewer checks only this)

- [ ] Objective and chips are coherent: happy = setup question, broken = symptom question, broken before fix
- [ ] Every chip has steps and an aha step; the trace is followable
- [ ] The tracing device is the best for students at the aha step, with the reason stated
- [ ] The doc is specific enough to build from without guessing

Status becomes `approved` only after the reviewer passes **and** Shardul ticks.

---

## Implementation gate (reviewer checks only this)

- [ ] Code matches the approved doc: chips, questions, steps, aha, tracing device, Read article
- [ ] Any deviation was written into the doc and approved by Shardul first

Otherwise the deviation is a bug.

---

## Slug doc template

File: `docs/superpowers/plans/v2-scenarios/<slug>.md`

```markdown
# <Title> (`<slug>`)

**Status:** draft | approved

## Objective

One paragraph.

## Prereqs

Optional bullets.

## Tracing device

What the student watches on stage, why it teaches best, whiteboard at the aha step.

Implementer note: reuse | extend | new — one line.

## Scenarios

### <chip-id> — <tab label>

Question: …
Misconception: …
Interview question: …
Aha: step N

Steps: 1. … 2. … 3. …

(repeat per chip)

## Read article

<anchor | none>

## Notes

Optional. Non-obvious facts only — cite source inline. Omit if empty.

## Approval

- [ ] Reviewer pass
- [ ] Shardul
```
