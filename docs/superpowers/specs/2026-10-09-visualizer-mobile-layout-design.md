# Visualizer mobile layout: design

Date: 2026-10-09. Status: awaiting review. Builds on `2026-10-09-visualizer-variants-and-revision-design.md`, whose "Out of scope" line for touch drag and the mobile layout this spec replaces.

## Goal

Make Single and Revision usable on phones and tablets, and robust at the largest inputs. Today the page below 900px is an interim stacked fallback: the page scrolls, the stage is a fixed 380px, the panels are stacked blocks, the Revision footer scrolls away, tap targets are 24 to 34px, and touch drag does not work.

## Decisions

- **Single, phone:** the stage and playback stay on screen. Configure and Details open as bottom sheets over the lower part of the screen while the stage stays live above.
- **Revision, phone:** two columns where the cards stay readable, one column where they do not. Each module declares a minimum card width.
- **Touch reorder:** drag the grip with a finger.
- **Tablet portrait (700 to 900px):** the same layout as phones. Above 900px the desktop layout is unchanged.
- **Chips:** every chip group is one row with horizontal scroll.
- **Worst-case inputs:** shapes shrink to a readable floor, then scroll inside the stage.

## Compact layout switch

- The compact layout applies when the viewport is 900px wide or less, or 500px tall or less (landscape phone). The media queries live in `css/responsive.css`, and nowhere else.
- Layout follows size. Tap target size follows the pointer: `@media (pointer: coarse)` gives interactive controls a 44px minimum, so a touchscreen laptop or tablet in the desktop layout also gets 44px targets. Mouse users keep the dense sizes.
- Removed: the interim fallback block in `responsive.css`, the `--viz-stage-narrow-h` token and its uses, and the stacked-panel and rail rules for narrow widths.
- In compact mode the page is a fixed-height flex column (`100dvh`), so nothing scrolls except the places named below. Panel collapse preferences (`usePanelPrefs`) are not used in compact mode.

## Single, portrait compact

Top to bottom:

1. The wiki topbar, unchanged.
2. A one-row header: the title, the Single | Revision toggle, and a ⋯ menu. The menu holds Read article, Copy link and the subtitle.
3. The stage, filling all remaining height. The metric, the shape and the caption are rows of a flex column, so they never overlap.
4. The playback bar, two rows. Row one has the five transport buttons. Row two has the counter on the left and rotate, repeat and speed on the right.
5. The timeline strip, with 44px cells. Scrolling and follow mode are unchanged.
6. The dock: two buttons, "Configure · {active variant name}" and "Details".

At 390×844 the stage is about 540px tall, and at 320×568 about 260px.

## Sheets

- Configure and Details are bottom sheets, up to 60% of the viewport height, with a grab handle and a close button. The height is fixed, not draggable.
- Tapping the scrim, pressing Esc, or swiping down closes a sheet. Only one is open at a time. Focus is trapped while open and returns to the dock button on close.
- The stage stays visible and live above the open sheet. Playback keeps running. Changing a shared input restarts the run, as today.
- Configure holds the chip groups, sliders, the sequence field and the seed. The variant prev/next buttons stay beside the variant chips and are the touch route to switching variants.
- Details holds the Step, Log, About and Try tabs.
- On tablets (700 to 900px) a sheet is capped at about 520px wide and centred.
- Sheet state is not in the URL and not in storage. Under `prefers-reduced-motion` a sheet appears without sliding.
- The sheet is a new generic frame component in `components/visualizer/frame/` and knows nothing about a specific visualizer. It reuses the shared `Modal` focus handling where it fits.

## Chips

- Every chip group renders as a single row with horizontal scroll, an edge fade on the clipped side, and no wrapping. The selected chip is scrolled into view on mount and whenever the selection changes, including by prev/next.
- Chips are 44px tall under `pointer: coarse`.
- A group that fits scrolls nothing and shows no fade.
- This applies to all chip groups, in the sheet and on the desktop panel alike, so the field renderer has one chips layout.

## Landscape phone (500px tall or less)

- The stage is on the left. The right column holds the transport row, the strip and the two panel buttons. The sheets become right-side drawers over that column.
- The header is the same one row, and the topbar is unchanged.

## Stage rules and worst-case inputs

Measured at the largest inputs (eviction cache size 8 and 40 requests, caching 3 keys and 12 requests) in 320×300 and 400×220 stages:

- LRU's stack overflows into the caption, and clips at 220px.
- LFU's rows overlap and the "NEXT OUT" tag covers the last row at 220px.
- CLOCK's keys shrink to about 5px.
- The caching lanes render their state cards at about 5px.
- A two-line caption takes about half of a 220px stage.
- The metric overlays the FIFO "OUT" label.

Rules:

1. The stage is a flex column of metric row, shape area and caption row. Nothing is overlaid, so nothing overlaps at any height.
2. A shape shrinks only to a readable floor: 12px for keys, 10px for labels.
3. Below the floor the shape area scrolls inside the stage and keeps the active item in view. Vertical shapes (stack, ranking) scroll vertically, and lanes pan horizontally. Text never shrinks below the floor.
4. The caption wraps and is clamped to two lines in compact mode, with the rest reachable in the Details sheet.

The floor values are tokens in `tokens.css`. Shape components own their scrolling, and no shape names a visualizer.

## Revision

- The header, the compact switch and the tap targets are the same as Single.
- **Pinned footer.** The compact page is a fixed-height flex column, so the card list scrolls inside `viz-rev__scroll` and the footer stays at the bottom.
- **Columns.** The module contract gains an optional `revisionMinCardWidth` (default 250). Eviction declares about 170, caching about 300. The maximum columns come from the grid's measured inner width: `clamp(floor((width + gap) / (min + gap)), 1, 4)`. This replaces the fixed 1090, 810 and 540 thresholds. Consequence: caching at 768px wide goes from 3 columns to 2, with wider cards. The rows rule (`layoutRows`) is unchanged.
- **Cards.** Padding is trimmed. The card stage height follows the card width instead of a fixed 200px. The name truncates to one line with a tooltip.
- **Grip and "i".** A 44px hit area under `pointer: coarse`, with a smaller visual. In a 177px card this leaves about 80px for the name.
- **Touch reorder.** Dragging the grip uses pointer events for both mouse and touch, replacing HTML5 drag.
  - `touch-action: none` applies to the grip only, so a finger on the card body still scrolls the list.
  - While dragging, the dragged card follows the pointer and the other cards reflow live to show the drop position.
  - The list auto-scrolls when the pointer is within about 48px of the top or bottom edge of the scroll area.
  - Esc or a cancelled pointer aborts and restores the order. Dropping saves the order through the existing storage helper.
  - Keyboard reorder (Space picks up, ←/→ move, Space drops, Esc cancels) is unchanged.
  - The order and hit-test logic is a pure function in `lib/visualizer/core/` with its own tests.
- **Legend.** The footer shows the legend only when the module's cards use flow diagrams. Today it always shows, which is wrong for eviction, whose cards have no flow lines. In compact mode the legend is a "Legend" button that opens a small popover with the three line styles and the step badge.
- **Footer controls.** Legend (when applicable), Reset order, and the loop play/pause, each at 44px under `pointer: coarse`.
- **Popup.** The existing popup, with padding trimmed. It scrolls inside, and Open in Single is a 44px button.

## Padding and spacing

- Header, playback bar, strip, dock, sheets and cards use the smallest `--s*` steps that still keep 44px targets under `pointer: coarse`.
- No new fixed layout px values. Fluid units (`min()`, `clamp()`, `dvh`, `%`) for layout sizes, and fixed px only for borders, icons and touch targets.

## Structure

- New generic components in `components/visualizer/frame/`: `BottomSheet` (also the landscape drawer), `Dock`, `HeaderMenu`, `LegendPopover`.
- `VisualizerApp` picks the compact layout from a hook that reads the same media queries as `responsive.css`, so layout and styles cannot disagree.
- New pure code in `lib/visualizer/core/`: the columns-from-minimum-width function and the reorder hit-test and order helper.
- Module contract: optional `revisionMinCardWidth`. The two existing modules set it.
- Changed: `ConfigFields` (chips layout), `RevisionGrid` (pointer drag), `RevisionFooter` (conditional legend, compact form), `Stage` and the shapes (reserved rows, floor, inner scroll), `PlaybackBar` (compact rows), `TimelineStrip` (cell size), CSS under `css/view-visualizer/` and `responsive.css`.

## Testing

- **Unit (Vitest):** the columns function across widths and minimums, including 1 column when the minimum exceeds the width, and the reorder hit-test and order helper (move first to last, last to first, no-op, cancel).
- **Component:** the sheet (open, close by scrim, Esc and swipe, one at a time, focus trap and return), the ⋯ menu, scrolling chips (selected chip scrolled into view, no fade when it fits), the legend shown only for flow modules, the legend popover, pointer-drag reorder (drop saves, cancel restores, keyboard unchanged), and the shapes' reserved rows and floor.
- **E2e (`tests/e2e/test_visualizer.py`):** at 390×844, 360×740, 320×568, landscape 844×390 and tablet 768×1024.
  - No page scroll in compact mode.
  - The Revision footer stays pinned.
  - Worst-case inputs (eviction size 8 with 40 requests, caching 3 keys with 12 requests) show no overlap and text at or above the floor.
  - Touch-drag reorder persists across reload.
  - Under `pointer: coarse` interactive controls are at least 44px.
- Typecheck, lint and the suite run once at the end.

## Docs to update when built

- `docs/_meta/visualizer/README.md`: remove the mobile layout roadmap item, describe the compact layout and sheets in page anatomy, and update the Revision text.
- `docs/superpowers/specs/2026-10-09-visualizer-variants-and-revision-design.md`: replace the "Out of scope" line about touch drag and the mobile layout, and the card width and column rules.
- `CONVENTIONS.md`: the Visualizer and CSS notes, including the `pointer: coarse` rule.
- `CLAUDE.md`: the file map rows for the new components.

## Out of scope

- Draggable sheet heights, swipe-between-cards carousels, and any phone-specific content that differs from desktop.
- Real-device testing beyond emulated viewports and touch.
