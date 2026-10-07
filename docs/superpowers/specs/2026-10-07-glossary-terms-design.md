# Glossary Terms and Links — Design

## Purpose

Terms in an article that need explaining are marked in the markdown, defined once in `data/glossary.json`, and explained in place on hover, click, long-press or keyboard. Links to other pages are visibly links and open in a new tab. One inline element can be both a term and a link.

## Element types

| Type | Example | Look |
| --- | --- | --- |
| Plain term | `<abbr>amortized</abbr>` | dotted underline, body colour |
| Linked term | `[<abbr>Trie</abbr>](../trie.md)` | link colour plus dotted underline |
| Plain link | `[Design Twitter](../twitter.md)` | link colour |

- Prerequisite chips are linked terms, marked automatically from the chip title.
- A link to an anchor on the same page scrolls in place, in the same tab, with no icon.
- Every other link (another wiki article or an external page) opens in a new tab and shows a new-tab icon, on every surface: article body, prerequisite chips, Related, Mentioned by, bridges, search results.

## Markup and build

- `<abbr>` marks a term. When the displayed text differs from the glossary key, `data-term` names the key: `<abbr data-term="collision">collisions</abbr>`. No automatic plural matching.
- The build resolves every definition from `data/glossary.json` and writes it into the HTML. Nothing is fetched or looked up in the browser.
- The build fails when a marked term or a prerequisite chip has no glossary entry.
- Glossary keys are lowercase and singular. Every article concept, prerequisite chip term (including chips for unwritten articles) and marked term has an entry.
- The article-link hover card (title + excerpt) and `previews.json` are removed; explanations come only from the glossary.

## Visuals

- Visible underline: dotted, about 2px.
- Hit strip: an invisible area below the term covering the gap to the next line plus the term's own descender zone, about 9–11px at default settings.
- The strip draws inside the existing line gap: lines with terms are exactly as tall as lines without. A test compares line spacing on lines with and without terms.
- Article line height follows the Line height preference (Tight 1.5 / Normal 1.7 / Relaxed 1.9), default Normal.
- Cursor: `?` (`cursor: help`) over the strip, hand over link text.

## Interaction

| Input | Plain term | Linked term or chip |
| --- | --- | --- |
| Mouse | hover or click the underline or word → box | hover or click the underline strip → box; click the text → open in new tab |
| Touch | tap → box (bottom sheet) | tap → open link; long-press → box (bottom sheet) |
| Keyboard | Space or Enter → box | Enter → open link; Space → box |
| Any | Escape or outside click/tap closes the box | same |

- Space opens the box only when focus came from the keyboard (`:focus-visible`); after a mouse click, Space keeps scrolling the page.
- The definition is linked to the element with `aria-describedby`, so screen readers read it on focus.
- The desktop box stays inside the viewport.
- Touch: the box is a bottom sheet, so the finger never covers it. The native link callout (iOS preview menu, Android context menu) is suppressed on marked links only; plain links keep it.
- A long-press on a linked term opens the box and does not start a text selection; highlighting those words starts the drag from outside the term.

## Authoring

- Writer instructions require marking every term that needs explanation, with `data-term` when the text differs from the key, and a glossary entry per term. Rater instructions check all three.

## Tickets

| Order | Ticket | Covers |
| --- | --- | --- |
| 1 | WIKI-674 | Line height preference wired; default 1.7 |
| 1 | WIKI-675 | Complete `glossary.json` (~159 new definitions) |
| 1 | WIKI-676 | Writer and rater rules |
| 2 | WIKI-677 | Build: `data-term`, terms inside links, chip marking, build failure on undefined terms |
| 3 | WIKI-678 | Box for mouse and keyboard; removes HoverPreview and `previews.json` |
| 4 | WIKI-657 | Box on touch: tap, long-press, bottom sheet |
| any | WIKI-679 | New-tab links and icon; `index.md` links map to the vertical root |
| any | WIKI-673 | `/glossary` page listing every term |
| after 676 + 677 | SD-076, DSA-030 | Mark terms across the articles |
