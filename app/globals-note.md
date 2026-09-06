# CSS import strategy

`css/` stays at the repo root; `app/layout.tsx` imports `../css/wiki.css` (aggregator, 27 `@import`s) plus `katex/dist/katex.min.css`. Faithful port — no Tailwind/Modules/CSS-in-JS. Shiki inlines its colours, so no highlight.js stylesheet.
