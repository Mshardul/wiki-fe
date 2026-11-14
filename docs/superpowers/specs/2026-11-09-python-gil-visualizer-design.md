Historical: HTML drafts are no longer used for new visualizers.

# Visualizer — Inside the Python GIL — Design

Section-wide principles live in `docs/_meta/visualizer/README.md`. This spec is the first mechanism visualizer and the smallest shared changes it needs. Eviction, caching, and rate limiting stay compare visualizers on the current page.

## Purpose

Let a reader step through who holds the CPython GIL, then through the three cases where that story breaks. The page is a visualizer in the same app as eviction: same top bar, same fonts, same theme tokens, same step list. The diagram is a new generic **schedule** shape (rows over continuous time, revealed up to now), described below. The first build mapped the draft onto the rate-limiting timeline; that lost the reveal, the lock-holder row, the arrows, the timer bars and the counter, so it was replaced.

Success: opening `/visualizer/inside-the-python-gil/` shows the four scenarios from `content/Visualizer/Inside the Python GIL.html`, stepped with the shared playback controls, and Preferences recolors the page and the diagram. Eviction still opens on its current page.

Audience: the author plus a small known circle.

## Two kinds, one section

Every registry entry has `kind: "compare" | "mechanism"`.

| Kind | Who | Page |
|---|---|---|
| `compare` | eviction, caching, rate limiting | the current three-column page, including Single / Revision |
| `mechanism` | this page, and later mechanism pages | the mechanism page described below |

The index at `/visualizer/` is one card grid with two groups, in this order:

1. **Compare algorithms.** Pick one, change the inputs, and watch what changes.
2. **Watch a mechanism.** Step through it, then through the cases where it breaks.

The card title is the topic. The GIL card description is: "Step through who holds the lock, then the cases where a CPU thread, a convoy, or a checkpoint breaks it."

URLs stay `/visualizer/<slug>/`. This page's slug is `inside-the-python-gil`.

## Mechanism page

The route renders `MechanismApp` when `kind` is `mechanism`, and `VisualizerApp` otherwise. The top bar is `IndexTopbar`, already on the route. Breadcrumb: Visualizer › Inside the Python GIL.

Under the top bar:

- A kicker, then the title, then the subtitle. Kicker: `CPython 3.12+ · default build · switch interval 5 ms`. Title: `Inside the Python GIL`. Subtitle: "One timeline, four situations. Each thread is a lane; the GIL row on top shows who holds the lock. Step through a scenario to see exactly when the lock changes hands, and why."
- Copy link. Read article is omitted, because this module has no article yet (`articleHref` is `""`).
- No Single / Revision control, no input panel, no seed.
- Scenario tabs from the module's only field, a chips field named `scenario`. Switching scenario restarts at step 1.
- The stage, filled by the timeline component.
- A legend under the stage, from the module, in this order: Running Python (holds GIL); Waiting for GIL; In a blocking call (GIL released); 5 ms switch timer; Drop request; Checkpoint where the GIL was dropped. Each entry names a schedule swatch (`solid`, `hatch`, `outline`, `meter`, `arrow`, `pin`), drawn with the same colours as the diagram.
- The shared playback bar: counter, previous, next, play, the step strip, and speed. Rotate and repeat are hidden.
- The current step's heading and body.
- Two notes for the current scenario: Takeaway, and Generalizes to.
- One muted line under the notes: "Timings are illustrative of the mechanism, not measured." No keyboard hint.

The scenario is stored with the existing visualizer URL state, as the chips value, not as a hash. Copy link copies that URL.

## Steps

A step is a `VizFrame`. For this page:

- `label` is the draft frame heading.
- `lines` is one rich line, the draft frame body. Inline code in the draft stays code in the rich text.
- `caption` is the same heading as `label`.
- `outcome` is `good`, except the race scenario's last frame ("T1 stores 101"), which is `bad`.
- `badge` is empty. `vars` is empty. `logNote` is empty. `metric` is empty. `path` is empty.
- `model` is a `ScheduleModel` for that frame.

`run()` returns those frames and an `InfoContent` whose `about` pairs are Takeaway and Generalizes to for the selected scenario. `tries` is empty. `unit` is `step`. There is no revision spec.

## Scenarios

The only input is `scenario`. Default is `happy`. Option order:

| id | Tab | Short | Frames |
|---|---|---|---|
| `happy` | Happy path | I/O-bound threads | 8 |
| `cpu` | Scenario 1 | CPU-bound threads | 8 |
| `convoy` | Scenario 2 | Convoy effect | 7 |
| `race` | Scenario 3 | Race conditions | 8 |

Questions, takeaways, and generalizations are copied from the draft's scenario objects (`q`, `take`, `gen`). The traces are the draft's, unchanged. The question for the selected scenario is the line above the stage.

The draft's frames skipped changes (for example, the happy path jumped from 8 ms to 20 ms over four handoffs). Student feedback was that these jumps lose them, so the frames follow the README's step rule: every handoff, blocking call, timer start or expiry, drop request and counter change gets its own step. The draft's headings and bodies are kept where their step still exists; new steps get new copy in the same voice.

The race scenario has two traces in the draft (`A` and `B`). Each frame names one trace. That frame's model is the trace it names, drawn at that frame's time. Stepping switches traces when the frame says so.

## Schedule shape

The rate-limiting timeline is a discrete tick axis with marks; the draft is continuous time with rows that fill in as the clock runs. Those are different structures, so this page adds one generic shape, `ScheduleModel` (`kind: "schedule"`), drawn by `ScheduleShape`. The timeline component is unchanged. The other lane-style drafts (Go scheduler, asyncio event loop, Redis single thread) are expected to reuse it.

The model, in structural words only:

- `end` (axis length), `now` (may be fractional), `tickEvery` (axis label spacing) and `unit` (suffix on the 0 tick). The numbers are always drawn. When `unit` is `null` they have no suffix, and `axisLabel` is the caption above them. The GIL adapter passes `tickEvery: 2` for every scenario.
- `summary`: an optional row above the others, with a label and labelled segments. The GIL adapter fills it with who holds the lock (each running segment, labelled with its thread).
- `rows`: each has an `id`, a `label` and `segments`. A segment has `from`, `to`, an optional `label` and a `style`: `solid`, `hatch` or `outline`.
- `meters`: a countdown bar above one row, from `from` to `to`.
- `arrows`: at a time, from one row to another, with a label.
- `pins`: a vertical mark on one row at a time, with an optional label.
- `values`: an optional row of labelled points under the rows (`text`, optional `note`, optional `bad`).
- `track`: frames with the same track glide from one `now` to the next; a new track starts from 0. The GIL adapter uses `<scenario>:<trace>`.
- `marksEvery`: faint marks along solid segments at that spacing, or `null`. The GIL adapter passes the draft's `tickEvery` (0.5 ms checkpoints on the CPU and convoy scenarios).
- `share`: an optional readout under the diagram, `<lead> <now> <unit>:` then each row's solid time and share, then `<idle>` and the rest. The GIL adapter uses `GIL held at` and `free` when the trace has a unit.
- `note`: a line under the diagram when there is no share readout. The race traces use the draft's checkpoint note.

The shape draws only what has happened by `now`: segments are cut at `now`, arrows, pins and values appear once their time has passed, and a meter fills up to `now` over a faint track. A segment label shows once the segment is complete and only if it fits. A dashed playhead marks `now`. Anything past `end` is clamped. The SVG keeps a readable minimum width and scrolls sideways on narrow stages.

Draft → schedule mapping (in `lib/visualizer/gil/schedule.ts`):

| Draft | Schedule |
|---|---|
| Running Python (`run`) | segment `solid`, label from the draft; also a `summary` segment labelled with the thread |
| Waiting (`wait`) | segment `hatch` |
| Blocking call (`io`) | segment `outline`, label from the draft |
| Switch timer | a `meter` on that thread's row |
| Drop request | an `arrow` from the requester to the holder. The legend names it, so the arrow carries no text |
| Checkpoint | a `pin` on that thread's row |
| Counter (race) | `values` labelled `counter` |

Colours: `solid` uses `--viz-active`; `hatch` uses `--text-muted`; `outline` uses `--viz-good`; the summary row and meters use `--viz-exit`; arrows and `bad` values use `--viz-bad`; pins use `--text-heading`. Type comes from `--font-mono` and the text scale. No hex, no new colour token.

Between steps on the same track the clock glides from the previous `now` to the new one, as in the draft (350–1100 ms, ease in-out), so bars visibly grow rather than jump. With `prefers-reduced-motion` it jumps. The readout counts along with the glide; the screen-reader description uses the step's own `now`.

## Mechanism page layout

The mechanism page scrolls inside the visualizer page (the page is one viewport tall), so the legend, playback and notes are always reachable. The step heading and body sit directly under the question and above the diagram, in a box whose height is the tallest step of the selected scenario, so the diagram does not jump between steps. The step strip shows a number per step, with the heading as its tooltip. When a scenario has more than one trace, consecutive steps of the same trace sit in a labelled rectangle: the race scenario shows "Version A · counter += 1" around steps 1–4 and "Version B · counter += one()" around steps 5–8. The legend lists only the marks the selected scenario draws, and its arrow and checkpoint swatches match the diagram.

The schedule is drawn at the stage's own width in pixel units, so labels keep their real size and the time axis compresses. Below 480px the label column narrows and axis numbers thin out so they never overlap. Nothing scrolls sideways. The stage takes the schedule's natural height rather than stretching.

## Files

- `lib/visualizer/registry.ts` carries `kind` and the GIL entry.
- `lib/visualizer/modules.ts` registers the GIL module.
- `lib/visualizer/gil/` holds the module, the scenario data, and the timeline built from a frame.
- `components/visualizer/frame/MechanismApp.tsx` is the mechanism page.
- `lib/visualizer/core/shapes.ts` gains `ScheduleModel`; `lib/visualizer/core/geometry.ts` gains `scheduleLayout`; `components/visualizer/shapes/ScheduleShape.tsx` draws it; `css/view-visualizer/schedule.css` styles it.
- `app/visualizer/page.tsx` renders the two groups.
- `app/visualizer/[slug]/page.tsx` chooses the page from `kind`.

The HTML file `content/Visualizer/Inside the Python GIL.html` stays until this page has been looked at in the browser. This spec does not delete it.

## Non-goals

The other seven drafts. Diagram kinds beyond the schedule shape. Changing the timeline component. The glossary icon that opens an article. Revision. An input panel. Hash URLs. Deleting the HTML draft. New theme tokens. Changing eviction, caching, or rate limiting behavior.
