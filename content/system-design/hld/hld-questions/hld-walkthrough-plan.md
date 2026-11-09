# System Design (HLD) Walkthrough Plan

**Status: all decisions below are locked.** This file is the single source of truth for the series. Upload it, together with `hld-framework.md`, at the start of each new thread and name the question to run.

---

## 1. Goal

Learn how to answer high-level system design questions in tech lead interviews. The thing being learned is a repeatable way of working through any HLD question, shown on ten questions that each exercise a different pattern.

## 2. Who this is for

- Senior software engineer, 7+ years of experience, interviewing for remote tech lead roles.
- Core stack: Python (Flask/FastAPI), Go, React, AWS/GCP.
- No target company; assume a generic 45-60 minute HLD round.

## 3. Files in the series (locked)

| File | Role | Contains |
|---|---|---|
| `hld-walkthrough-plan.md` (this file) | How the series runs | Ground rules, step sequence, question list, output format, progress |
| `hld-framework.md` | The generic method | For each of the seven steps: purpose, how to tackle it, a "what to say" template, mistakes to avoid. Fully question-agnostic. |
| `qN-<name>.md`, one per question | The worked answer | The specific design for that question only. No generic method. |

The method lives in the framework file and the answer lives in the question file. The two never repeat each other.

## 4. Ground rules (locked)

| Decision | Locked value |
|---|---|
| Mode | Pure learning walkthrough. No attempt-first exercises, no quizzing, no simulated interviewer back-and-forth. |
| Thread structure | One question per thread. |
| Response structure | One response per step (seven per question), then the recap as its own response. Wait for "next" before moving on. |
| Reading time | 45-60 minutes in total per question, across all seven steps plus the recap. |
| Scope | Classic HLD only. No GenAI system design. |
| Question selection | By pattern, not by famous name. |
| Baseline | Do not define basic terms (sharding, replication, caching, queues, consistency models, and similar). |
| Technologies | Name real technologies (for example Cassandra, Kafka, Redis, S3), and state the property that earned the pick so an equivalent can be swapped in. |
| Time budget | Separate from the 100-hour interview prep plan. |
| Output | One md file per question, created on request at the end of the thread, in the format defined in section 8. |
| Out of scope for this phase | Cross-question summary sheets, and preparing a walkthrough of a self-built system. Both belong to a later phase. |

## 5. The seven steps (locked)

Every question runs through the same sequence, one response per step:

1. **Scope and requirements** — functional and non-functional, plus what is explicitly out of scope.
2. **Scale estimates** — only the numbers that drive a design decision.
3. **API and data model** — endpoints, entities, keys, access patterns.
4. **High-level architecture** — components and data flow, with a diagram.
5. **Deep dives** — the two or three hard parts of this particular system.
6. **Bottlenecks, failure modes, trade-offs** — what breaks first, and what was given up.
7. **Tech lead layer** — phasing and MVP, cost, observability, and what to push back on.

After step 7 comes a **one-screen recap**: the pattern, the four or five decisions that define it, and the numbers worth remembering. The recap is for revision, not a quiz. In the thread it is delivered last; in the saved file (section 8) it sits at the top.

## 6. What every step response must contain (locked)

This section governs the responses in the thread. The saved file follows section 8 instead.

For the step as a whole:

- **A short opener on what the step is for,** and a short list of **mistakes to avoid** at the end. These follow `hld-framework.md` and stay brief, since the framework file holds the full method.
- **How much interview time** this step deserves.
- **What to say** in the interview at this point, as a script specific to this question.

For every real design decision in the step (choice of store, partition key, cache strategy, sync vs async, consistency level, and similar):

- **Why** this choice fits the requirements.
- **How** it works under the hood, at the depth an interviewer would probe.
- **Alternatives** considered, and when each of them would be the better pick.
- **Pros and cons** of the chosen option, including what it costs later.

This applies to decisions, not to every sentence, so the question stays within its reading time.

## 7. Question list and order (locked)

The order runs from simple to hard. Each question introduces a pattern the earlier ones did not.

| # | Question | Pattern it teaches |
|---|---|---|
| 1 | URL shortener | Read-heavy key-value store, ID generation, caching. |
| 2 | News feed (Twitter) | Fan-out on write vs on read, the celebrity problem. |
| 3 | Chat (WhatsApp) | Persistent connections, delivery guarantees, message ordering. |
| 4 | Video streaming (YouTube) | Blob storage, transcoding pipeline, CDN. |
| 5 | Ride hailing (Uber) | Geospatial indexing, real-time matching. |
| 6 | Typeahead search | Tries, precomputation, latency budgets. |
| 7 | Ticket booking (BookMyShow) | Strong consistency, locking, contention spikes. |
| 8 | Notification system | Async pipelines, retries, idempotency, deduplication. |
| 9 | Rate limiter | Infrastructure component, distributed counters. |
| 10 | Collaborative editor (Google Docs) | Conflict resolution, OT vs CRDT. |

Spotify and TikTok are not separate questions: both are combinations of patterns 2 and 4, and this is called out in those threads.

## 8. The per-question file (locked)

Created on request at the end of the thread. One file per question, named `qN-<name>.md`, for example `q2-news-feed.md`.

**How it is built:** from a full re-read of every message in the thread, at full detail. It is not a summary and nothing is shortened.

**What it contains, in this order:**

- A title and a one-line statement of the pattern, plus one short line naming what is reused from earlier questions.
- A **Table of Contents** with anchor links to the recap, every step, the deep dives (nested), and the final architecture.
- The **recap, near the top**: the four or five defining decisions as short bullets, and the numbers worth remembering as a bullet list. It is the revision card, so it is read first and exists nowhere else in the file.
- One section per step, in order, holding the answer for this question: requirements, numbers, API, schema, flows, and every decision with its why, how, alternatives (and when each is the better pick), and pros and cons.
- The "what to say" script for each step, kept short: the spoken version, not a second explanation of the reasoning.
- The architecture diagram as a Mermaid code block. Where the deep dives change the architecture, a second Mermaid diagram shows the final state.
- The trade-offs as a table: choice, what it cost, what it bought.
- A short "Related systems" note where the plan calls for one.

**What it must not contain:**

- Generic method: no "what this step is for", no "how to tackle it", no "mistakes to avoid", no interview time allocations. All of that belongs to `hld-framework.md`.
- Anything that applies to every question equally.
- Duplicated information. A number, decision, or trade-off has one home; only the recap may restate.
- Blocks that only repeat what is already stated: "why each box exists" tables, restated problem and constraint blocks, "skipped, with reasons" lists, prose that re-describes a diagram or a table directly above it.

**Depth follows the topic, not the file size:**

- The new, hard concept a question exists to teach gets full depth: why, how, alternatives, cost.
- A concept taught in an earlier question gets a one-line pointer plus what is different here.
- Routine material (most estimates, field lists) is a table row.
- Within the 45-60 minute reading time, easier questions land lower and harder ones higher. Each paragraph must pass one test: is it new to this question, hard to grasp, or something an interviewer would probe?

**Formatting:**

- A list stays a list and a table stays a table. Never collapse bullets into a paragraph.
- Paragraphs stay under about four lines; split longer ones into bullets.
- No hard-wrapping: one line per paragraph or list item.
- No notes to the editor in the file (nothing like "in one line each" or "named once"). The file reads as finished content.

**Layout and naming standard (identical in every question file):**

| Element | Standard |
|---|---|
| Title | `# Q<N>: <Topic>`, for example `# Q4: Video streaming (YouTube)` |
| Intro | The `**Pattern:**` line. From Q2 onward, a `Reused from earlier questions:` bullet list, one bullet per earlier question. |
| Contents | `## Table of Contents`, then `## Recap` |
| Recap | `**In one line:**` (the whole approach in one sentence), `**The five decisions that define it**` (numbered, four or five), `**Numbers worth remembering**` (bullets, not a table). Question-specific extras may follow, such as Q3's contract. |
| Section titles | `## 1. Scope and requirements`, `## 2. Scale estimates`, `## 3. API and data model`, `## 4. High-level architecture`, `## 5. Deep dives`, `## 6. Bottlenecks, failure modes, and trade-offs`, `## 7. Tech lead layer`. `## Related systems` goes last, only where the plan calls for it. |
| Decision headings | `### Decision <section>.<n>: <the choice>`, numbered by section and in order: 1.1, 3.2, 4.1. In a deep dive, `Decision 5.<dive>.<letter>` when a dive has several (5.1a, 5.1b) and `Decision 5.<dive>` when it has one. Never restart numbering inside a section. |
| Decision body | Bullets in this order: **Why**, **How**, **Alternatives**, **Pros**, **Cons**. No bullet that repeats the heading, and no "Cost" or combined "Pros and cons" label. |
| Alternatives | Always the plural label. One sub-bullet per alternative: its name, a line or two on what it is, and when it would be the better pick. A comparison table is allowed when there are three or more options. |
| Section 2 | Anchors first (a short table or bullets). Then one bold block per quantity: the calculation as bullets, then `- *So therefore:*`. The system-defining number gets the fullest block. |
| Deep dives | Numbered `### Deep dive 1`, `2`, `3`, never letters. Each opens with its constraints as a short bullet list, then the decisions. Sub-points inside a dive are `#### ` headings. |
| Final architecture | `### Final architecture, after the deep dives` (a diagram and one line saying what changed) |
| Section 6 | Stress the design box by box, then these subsections with these names: `### Abuse`, `### At 10×`, `### Single point of failure`, `### Trade-offs` (the table). |
| Section 7 | `### Phasing` (phases as bold blocks, each with a `Trigger:` line, never a table), `### Cost`, `### Observability`, `### Pushback on requirements` (a table: requirement, what it undermines, what to ask or propose). |
| "What to say" | One blockquote per section: the first-person version you say out loud in the interview. It is interview content, not duplicate material, so it has no length cap and must carry every defining decision, number and technology of its section. Section 5's script opens by offering the interviewer the order of the deep dives. |
| Notation | `10×`, never `10x`. Use "Q1" to "Q5" for cross-references to other questions and "section N" for this file. |

## 9. How to run a thread

1. Start a new thread and upload this file and `hld-framework.md`.
2. Say which question to run, for example "Question 2: news feed".
3. The first response is step 1 only. Say "next" to get each following step.
4. After step 7, "next" gives the recap.
5. Ask for the md file. It is produced in the format of section 8.

## 10. Progress

- [x] 1. URL shortener
- [x] 2. News feed (Twitter)
- [x] 3. Chat (WhatsApp)
- [x] 4. Video streaming (YouTube)
- [x] 5. Ride hailing (Uber)
- [ ] 6. Typeahead search
- [ ] 7. Ticket booking (BookMyShow)
- [ ] 8. Notification system
- [ ] 9. Rate limiter
- [ ] 10. Collaborative editor (Google Docs)
