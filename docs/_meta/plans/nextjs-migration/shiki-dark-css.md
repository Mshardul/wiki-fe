# Shiki dual-theme — dark activation CSS (for `app-skeleton.md` Phase 3)

`@shikijs/rehype` 4.4.3 with `themes: { light: "github-light", dark: "github-dark" }` emits **dual-theme output**, not an active dark mode:

```html
<pre class="shiki shiki-themes github-light github-dark"
     style="background-color:#fff;--shiki-dark-bg:#24292e;color:#24292e;--shiki-dark:#e1e4e8" tabindex="0">
  <code><span class="line"><span style="color:#D73A49;--shiki-dark:#F97583">const</span>…</span></code>
</pre>
```

Light values are the live `color` / `background-color`; dark values are parked in `--shiki-dark` / `--shiki-dark-bg` custom properties on every element. **Without a CSS rule to promote them, code blocks stay light-themed in dark mode.**

`app-skeleton.md` Phase 3 adds this block to `css/view-content/code.css` (a rule, not a token — `tokens.css` stays as-is). Cover all three theme states the artifact/app theming uses (explicit dark, and system-dark via `:not([data-theme="light"])`):

```css
:root[data-theme="dark"] .shiki,
:root[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .shiki,
  :root:not([data-theme="light"]) .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
  }
}
```

`!important` is required — it overrides the inline `style` Shiki writes. The `span`-level rule is needed because each token span carries its own inline `color`.

Property names verified against `@shikijs/rehype` 4.4.3: `--shiki-dark`, `--shiki-dark-bg`. Re-confirm if the version changes.

This replaces the old `atom-one-dark.min.css` CDN link (highlight.js) — no external stylesheet, Shiki inlines all colours.
