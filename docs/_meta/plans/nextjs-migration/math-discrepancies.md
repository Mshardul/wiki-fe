# Math rendering — Showdown → KaTeX equivalence (spec §12 risk)

**Result: no discrepancies. The risk is effectively empty.**

## What was checked

`js/state.js` `mathExtension` is a Showdown lang/output extension that base64-roundtrips `$$…$$` and `$…$` spans to protect them from Showdown's markdown mangling, then a client-side KaTeX auto-render pass renders them. The concern (spec §12) was that content relying on this could render differently under `remark-math` + `rehype-katex`.

## Finding

A grep across the whole corpus (`content/**/*.md`) for LaTeX:

- `$$` fenced math blocks: **0**
- `\frac`, `\sum`, `\sqrt`, `\lfloor`, `\cdot`, `\log_`, `\Theta`, `\Omega`: **0**
- inline `$…$` math: only false positives (shell prompts `$ `, prices `$5/GB`) — all inside backtick code spans, which `remark-math` correctly ignores.

Corpus authors write formulas as **inline code spans** (`` `p → (1 − e^(−kn/m))^k` ``, `` `O(n log n)` ``), never as LaTeX. The Showdown math extension was wired up but never used by content.

## Consequence

- `remark-math` + `rehype-katex` stay in the pipeline (`lib/content/pipeline.ts`) — they cost nothing and are correct for any future LaTeX.
- `tests/content/math-equivalence.test.ts` renders 8 LaTeX-shaped expressions (the kind that *could* plausibly appear in DSA/SD content) and asserts KaTeX produces output with no `katex-error`. All pass.
- No content changes needed. No compat remark plugin needed.
- The inline `$` false-positive problem that forced Showdown's `(?!\s)` guard does not exist for `remark-math` (stricter delimiter rules, and it never touches code spans).
