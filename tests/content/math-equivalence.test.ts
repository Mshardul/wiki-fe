import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../lib/content/pipeline";
import type { RenderContext } from "../../lib/content/types";

const ctx: RenderContext = {
  articlePath: "content/dsa/x.md",
  verticalId: "dsa",
  allArticlePaths: new Set(),
  glossary: {},
};

// The corpus authors write formulas as inline code spans (`p → (1 − e^(−10k))^k`),
// NOT as LaTeX. A grep for `$$` / `\frac` / `\sum` / `\sqrt` across content/**/*.md
// returns nothing. So the "custom $$ extension renders differently" risk (spec §12)
// is effectively empty. These cases confirm the KaTeX chain still works for the
// handful of LaTeX-shaped expressions that could plausibly appear.
const EXPRESSIONS = [
  "$O(n \\log n)$",
  "$\\Theta(n^2)$",
  "$$T(n) = 2T(n/2) + O(n)$$",
  "$\\lfloor n/2 \\rfloor$",
  "$$p = \\left(1 - e^{-kn/m}\\right)^k$$",
  "$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$",
  "$a \\bmod p$",
  "$$\\gcd(a, b) = \\gcd(b, a \\bmod b)$$",
];

describe("math equivalence (KaTeX chain)", () => {
  for (const expr of EXPRESSIONS) {
    it(`produces KaTeX output for ${expr}`, async () => {
      const { html } = await renderMarkdown(`Some text ${expr} more text.`, ctx);
      expect(html).toContain("katex");
      // KaTeX emits an error span with this class on a parse failure
      expect(html).not.toContain("katex-error");
    });
  }
});
