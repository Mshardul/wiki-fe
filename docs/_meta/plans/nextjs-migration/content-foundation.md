# Content Foundation — Phase File (spec Sub-spec 1)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Run phases in order, inline in-session, stop for review at each phase boundary. Steps use `- [ ]` checkboxes. Read [`overview.md`](./overview.md) first — its **Global Constraints** apply to every step here (no git steps; TDD red-green for units; Vitest; stack versions).

**Maps to:** spec [`../nextjs-migration-design.md`](../nextjs-migration-design.md) §5 Sub-spec 1, §6, §7.

**Deliverable:** `lib/content/` — the complete build-time content system as a real, importable TypeScript library with the exact function signatures the `app-skeleton.md` route files will call. Plus the toolchain (TS, Vitest, ESLint, Biome) the whole migration builds on. **Touches nothing in the running vanilla app** — `index.html` + `js/**` keep shipping unchanged throughout.

**What this is NOT:** no Next.js project yet (that is `app-skeleton.md`), no React, no routes, no client islands. This phase file produces a library + its tests only.

---

## Interfaces this phase file produces

Later phase files consume these. Names and signatures are fixed here; `app-skeleton.md` and `cutover.md` must match exactly.

```ts
// lib/content/index.ts — public surface
export function getVerticals(): Vertical[];
export function getVertical(id: string): Vertical | undefined;
export function getArticleSlugs(): { vertical: string; slug: string[] }[];   // for generateStaticParams
export function getArticle(vertical: string, slug: string[]): Article | undefined;
export function getManifest(): Manifest;                                      // full build-time index
export function getVerticalIndex(id: string): VerticalIndex;                  // parsed index.md structure
export function getBacklinks(targetPath: string): BacklinkRef[];              // "Mentioned by" spine
export function getRelated(vertical: string, slug: string[]): RelatedRef[];   // same-section ranking

// lib/content/types.ts
export interface Vertical {
  id: string;                 // "system-design" | "dsa"
  title: string;
  description: string;
  icon: string;               // emoji, as today
  color: string;              // hex, as today
  indexPath: string;          // repo-relative path to index.md
  articleCount: number;       // DERIVED from the manifest at build, not hand-maintained
}

export interface Heading { depth: 2 | 3 | 4; text: string; id: string; }

export interface Article {
  path: string;               // repo-relative, e.g. "content/dsa/patterns/sliding-window.md"
  slug: string[];             // ["patterns", "sliding-window"]
  verticalId: string;
  title: string;              // from leading # H1
  headings: Heading[];        // for TOC
  prerequisites: Prerequisite[];
  html: string;               // fully rendered article body HTML
  excerpt: string;            // first meaningful paragraph, plain text, for hover-previews
  byteSize: number;           // raw markdown byte length
  isStub: boolean;            // byteSize < STUB_THRESHOLD (5000)
  shapeFingerprint: ShapeFingerprint;
  readingTimeMin: number;     // null-equivalent handling: stubs report 0
}

export interface Prerequisite {
  title: string;
  href: string | null;        // resolved cross-link, null if unlinked
  level: "Must" | "Should" | null;
}

export interface ShapeFingerprint {
  headings: number;
  codeBlocks: number;
  tables: number;
  paragraphs: number;
}

export interface Manifest {
  generatedAt: string;
  verticals: Vertical[];
  articles: Article[];        // html omitted in the serialized manifest.json (too large) — see Phase 6
}

export interface VerticalIndex {
  id: string;
  sections: { heading: string; articles: { title: string; slug: string[]; path: string; isStub: boolean }[] }[];
  learningPaths: { track: string; rows: { title: string; slug: string[] | null }[] }[];
}

export interface BacklinkRef { fromPath: string; fromTitle: string; fromVerticalId: string; }
export interface RelatedRef { path: string; title: string; slug: string[]; }
```

---

## Global constraints specific to this phase file

- **Package manager: pnpm.** Every install command is `pnpm add -D …` / `pnpm add …`. Use `.venv/bin/python3` only for running the *existing* Python scripts as the equivalence reference — never `pip`, never bare `python3` (repo rule, memory `feedback-use-venv-python`).
- **Comments: one line each** (memory `feedback-single-line-comments`) — JS/TS and test files included. No multi-line prose comment blocks.
- **No ticket IDs** anywhere in code/config (memory `feedback-no-ticket-ids-in-code`).
- **All files under `content/**/*.md`** (~176 at time of writing; the corpus-smoke test counts them at runtime — never hardcode the number), verticals `system-design` and `dsa`. Articles have **no YAML frontmatter** — treat frontmatter as optional, derive title from leading `# H1`.
- **`STUB_THRESHOLD = 5000`** bytes — the exact constant from `js/state.js`. Reuse the value, not a new one.
- All new code under `lib/`, all tests under `lib/**/*.test.ts` (co-located) or `tests/content/` for the corpus smoke — decided in Phase 0.
- **Testing in this phase file is fixture-first (red-green)** — the remark/rehype plugins and the pure `lib/` functions are new logic, and the failing-test-first cycle earns its cost here (overview.md "Testing rule"; spec §12). The code-then-test shortcut applies only to island *ports* in `cutover.md` / `post-cutover.md`, not here. The corpus smoke (Phase 8) is the one exception — a regression net, not written failing-first.

---

## Phase 0 — Toolchain: TS + pnpm + Vitest + ESLint + Biome

**Goal:** a working TypeScript + test + lint/format toolchain at the repo root, so every subsequent phase writes typed, linted, tested code from its first line. No `lib/content` logic yet.

**Files:**
- Create: `package.json` (new — repo has none today), `pnpm-workspace.yaml` (only if needed), `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.nvmrc`
- Modify: `biome.json` (retarget), `.gitignore` (add `node_modules/`, `coverage/`, `.next/`, `out/`)
- Create: `lib/content/.gitkeep` placeholder removed once real files land

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm typecheck` scripts that all later phases rely on

- [ ] **Step 1: Pin Node exactly and enable corepack**

Find the current Node 24 LTS patch version (`node --version` if already on 24, `nvm ls-remote --lts | grep v24`, or nodejs.org). Create `.nvmrc` with that exact version, e.g.:
```
24.8.0
```
Run: `corepack enable && corepack prepare pnpm@10.34.5 --activate` — an **exact** version, never `@latest`.
Expected: `pnpm --version` prints exactly `10.34.5`.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "wiki-fe",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.34.5",
  "engines": { "node": "24.x" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && biome lint .",
    "format": "biome format --write ."
  }
}
```
`packageManager` must match the exact version prepared in Step 1. `engines.node` is `24.x`; the exact patch lives in `.nvmrc` and the CI `setup-node`.

- [ ] **Step 3: Install TypeScript + Vitest**

Run: `pnpm add -D typescript vitest @vitest/coverage-v8 @types/node`
Expected: `node_modules/` created, `pnpm-lock.yaml` written.

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "vitest/globals"],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "noEmit": true
  },
  "include": ["lib/**/*", "tests/**/*", "*.config.ts"],
  "exclude": ["node_modules", "js/**", "out", ".next"]
}
```
Note: `js/**` is excluded — the vanilla JS is not type-checked.

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/content/**/*.test.ts"],
    coverage: { provider: "v8", include: ["lib/**"], exclude: ["lib/**/*.test.ts"] },
  },
});
```

- [ ] **Step 6: Write a trivial failing test to prove the runner**

Create `lib/content/_smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain smoke", () => {
  it("runs typescript tests", () => {
    const x: number = 1 + 1;
    expect(x).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test, confirm it passes**

Run: `pnpm test`
Expected: PASS, 1 test. If it fails, the runner config is wrong — fix before continuing.

- [ ] **Step 8: Install ESLint flat config + plugins**

Run: `pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks @next/eslint-plugin-next eslint-plugin-jsx-a11y eslint-config-prettier`
(`@next/eslint-plugin-next` and the react plugins are installed now even though React lands later — the config references them and CI runs `eslint .` from Phase 1 on.)

- [ ] **Step 9: Create `eslint.config.js`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/**", "js/**", "css/**", "content/**", "out/**", ".next/**", "scripts/**", "tests/e2e/**", "*.min.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.tsx", "components/**/*.ts", "app/**/*.ts"],
    plugins: { react, "react-hooks": reactHooks, "@next/next": nextPlugin, "jsx-a11y": jsxA11y },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
    settings: { react: { version: "detect" } },
  },
  prettier,
);
```
`eslint-config-prettier` last disables every stylistic ESLint rule — Biome owns formatting, ESLint owns correctness, zero overlap (overview.md decision).

- [ ] **Step 10: Retarget `biome.json`**

Change `biome.json` so `formatter` and the CSS section stay, but `linter` is scoped to not fight ESLint. Set:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "files": { "ignore": ["content/**", ".venv/**", ".pytest_cache/**", "data/**", "node_modules/**", "out/**", ".next/**", "js/**", "**/*.min.js"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": false, "suspicious": { "noConsole": "error" } } },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } },
  "css": { "formatter": { "enabled": true }, "linter": { "enabled": true } }
}
```
`js/**` moves to `ignore` — the vanilla JS is frozen, not reformatted. `noConsole` stays as the one retained Biome lint rule (matches the repo's existing standard and `CONVENTIONS.md`).

- [ ] **Step 11: Run the full toolchain, confirm green**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all three pass. `eslint .` will report "0 files matching" for the tsx block — that is fine at this stage.

- [ ] **Step 12: Delete the smoke test**

Remove `lib/content/_smoke.test.ts` — it has served its purpose. Real tests start in Phase 1.

- [ ] **Step 13: Wire the toolchain into a pre-commit hook and note the CI job for `post-cutover.md`**

Add to `.pre-commit-config.yaml` a local hook that runs `pnpm lint` and `pnpm typecheck` on changed TS files. Do not touch `.pre-commit-config.ci.yaml` yet — the CI build job is designed in `app-skeleton.md` Phase 1 and finalised in `post-cutover.md`. Leave a one-line note at the top of `post-cutover.md`'s CI section: "pnpm typecheck + lint + test must be a CI gate."

**Exit criteria:** `pnpm typecheck`, `pnpm lint`, `pnpm test` all run and pass from a clean checkout after `pnpm install`. `js/**` and `css/**` are excluded from all three. No `lib/content` logic exists yet.

---

## Phase 1 — Mermaid CSS-variable theming spike (gate)

**Goal:** answer two questions before anything depends on them — (a) can the current Mermaid version's SVG output be fully recoloured by CSS variables, so build-time inline SVGs re-theme with the app and no diagram JS ships? and (b) is the full-corpus build cost acceptable?

**This is spec §7's mandated first task.** The rest of the plan assumes the build-time-SVG path. If the spike is not cleanly green **or** the build cost is high, take the client-island fallback (repo-wide shared `mermaid.js`, precached — overview.md "Mermaid" section). The fallback is **pre-authorised, not a failure** — the site is not public, so the build-time path's crawlability benefit does not apply; the theming requirement is met either way. Do not treat Chromium-in-CI as a blocker.

**Files:**
- Create: `lib/content/mermaid-spike/` — throwaway spike dir, deleted at the end of this phase regardless of outcome
- Create: `docs/_meta/plans/nextjs-migration/mermaid-spike-result.md` — the recorded decision (kept)

**Interfaces:**
- Consumes: nothing
- Produces: a documented pass/fail decision that Phase 4's mermaid plugin and `app-skeleton.md`'s theming work depend on

- [ ] **Step 1: Install the spike dependencies**

Run: `pnpm add -D rehype-mermaid playwright-core mermaid`
Then: `pnpm exec playwright install chromium`
Expected: Chromium downloads to the Playwright cache.

- [ ] **Step 2: Collect the real diagram set**

Write `lib/content/mermaid-spike/collect.ts` — a script that greps all ` ```mermaid ` fenced blocks out of `content/**/*.md` and writes them to `lib/content/mermaid-spike/diagrams.json` as `{ path, code }[]`. Run it. Record the count and the distinct diagram types (flowchart, sequence, classDiagram, stateDiagram, erDiagram, gantt, pie, …) in `mermaid-spike-result.md`.

- [ ] **Step 3: Render one diagram of each type with `themeCSS` referencing CSS variables**

Write `lib/content/mermaid-spike/render.ts` — for one diagram per distinct type, call `rehype-mermaid` (or mermaid directly via Playwright) configured with:
```ts
const mermaidConfig = {
  theme: "base",
  themeCSS: `
    .node rect, .node circle, .node polygon { fill: var(--diagram-node-fill); stroke: var(--diagram-node-stroke); }
    .edgePath .path { stroke: var(--diagram-edge); }
    .edgeLabel { background-color: var(--diagram-bg); color: var(--diagram-text); }
    text { fill: var(--diagram-text); }
    .cluster rect { fill: var(--diagram-cluster-fill); stroke: var(--diagram-cluster-stroke); }
  `,
};
```
Write each rendered SVG to `lib/content/mermaid-spike/out/<type>.svg`.

- [ ] **Step 4: Verify the SVGs contain `var(--diagram-*)` references, not resolved hex**

Write `lib/content/mermaid-spike/verify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "out");

describe("mermaid themeCSS passthrough", () => {
  for (const file of readdirSync(OUT).filter((f) => f.endsWith(".svg"))) {
    it(`${file} keeps css-variable colours`, () => {
      const svg = readFileSync(join(OUT, file), "utf8");
      expect(svg).toMatch(/var\(--diagram-/);
      expect(svg).not.toMatch(/fill:\s*#[0-9a-f]{3,6}/i);
    });
  }
});
```
Run: `pnpm test lib/content/mermaid-spike/verify.test.ts`

- [ ] **Step 5: Visual check — render one SVG against two token sets**

In a throwaway HTML file, embed one output SVG twice, once inside a container defining light `--diagram-*` tokens and once dark. Open it (this is a genuine visual question — allowed per memory `feedback-visual-companion-use`). Confirm the two render with different colours and no reload.

- [ ] **Step 6: Record the decision**

Fill `mermaid-spike-result.md`:
- **PASS** if Steps 4 and 5 both succeed for every diagram type present in the corpus → Phase 4 implements the build-time mermaid plugin; `tokens.css` gets `--diagram-*` tokens in `app-skeleton.md`. (The build-cost check happens in `app-skeleton.md` Phase 7; if it turns out high there, the fallback is still available.)
- **NOT CLEANLY GREEN** (any diagram type can't be CSS-variable-themed) → record which types fail and why. Take the fallback: `mermaid.js` added to the app-shell precache, diagrams render client-side on mount and re-theme by re-render, ~500 KB one-time cost. Diagram bodies are not in the pre-rendered HTML — acceptable, the site is not public. `app-skeleton.md` and `cutover.md` pick this up. Get review before proceeding.

- [ ] **Step 7: Delete the spike directory**

Remove `lib/content/mermaid-spike/`. Keep only `mermaid-spike-result.md` and, on PASS, the working `themeCSS` string (paste it into `mermaid-spike-result.md` for Phase 4 to lift).

**Exit criteria:** `mermaid-spike-result.md` records PASS or FAIL with evidence. On PASS, the working `themeCSS` string is saved. Spike dir deleted. On FAIL, review checkpoint before Phase 2.

---

## Phase 2 — Discovery, frontmatter, typed Article model

**Goal:** `lib/content` can find every article via `index.md`, load it, and produce a typed `Article` (minus `html` — the pipeline in Phase 3 fills that). Preserve today's "nothing globs the directory" rule — the ordered article list comes from `index.md`, not a filesystem walk.

**Files:**
- Create: `lib/content/types.ts` (the full interface block from the top of this file)
- Create: `lib/content/verticals.ts` — the vertical registry (replaces the `WIKIS` array in `js/state.js`)
- Create: `lib/content/discovery.ts` — `index.md` parsing → ordered article path list
- Create: `lib/content/article.ts` — load one markdown file → partial `Article`
- Create: `lib/content/discovery.test.ts`, `lib/content/article.test.ts`
- Create: `lib/content/fixtures/` — small hand-written markdown fixtures for unit tests

**Interfaces:**
- Consumes: `types.ts`
- Produces: `getVerticals()`, `getVertical(id)`, `discoverArticlePaths(verticalId): string[]`, `loadArticle(path): Omit<Article, "html" | "excerpt" | "headings" | "shapeFingerprint">` plus `title`, `byteSize`, `isStub`, `prerequisites`, `slug`, `verticalId`

- [ ] **Step 1: Write `lib/content/verticals.ts` with the registry data**

```ts
import type { Vertical } from "./types";

const REGISTRY: Omit<Vertical, "articleCount">[] = [
  {
    id: "system-design",
    title: "System Design",
    description:
      "Interview-ready references covering components, algorithms, and end-to-end system walkthroughs.",
    icon: "⚙️",
    color: "#6366f1",
    indexPath: "content/system-design/index.md",
  },
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    description:
      "Interview-ready DSA reference: data structures, algorithms, and the patterns that recognise them.",
    icon: "🧩",
    color: "#10b981",
    indexPath: "content/dsa/index.md",
  },
];

export function verticalRegistry(): Omit<Vertical, "articleCount">[] {
  return REGISTRY;
}
```
Data lifted verbatim from `js/state.js` `WIKIS` — except `indexPath` is now repo-relative without the `./content` prefix quirk, and `articleCount` is gone (derived in Phase 6). Duplicate-id guard from `state.js` is re-added as a test, not a runtime throw.

- [ ] **Step 2: Write the failing test for the duplicate-id guard and registry shape**

`lib/content/discovery.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { verticalRegistry } from "./verticals";

describe("vertical registry", () => {
  it("has unique ids", () => {
    const ids = verticalRegistry().map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("points every indexPath at an existing index.md", async () => {
    const { existsSync } = await import("node:fs");
    for (const v of verticalRegistry()) expect(existsSync(v.indexPath)).toBe(true);
  });
});
```

- [ ] **Step 3: Run it, confirm pass**

Run: `pnpm test lib/content/discovery.test.ts`
Expected: PASS (registry is static data, files exist).

- [ ] **Step 4: Inspect a real `index.md` to lock the parser contract**

Read `content/dsa/index.md` and `content/system-design/index.md` in full. Document in a one-line comment at the top of `discovery.ts` the exact structure: how sections are delimited (headings), how article links are written (`[Title](./path.md)` under a section), how learning-path tables look. This is the contract the parser implements.

- [ ] **Step 5: Write failing tests for `discoverArticlePaths` against a fixture**

Create `lib/content/fixtures/mini-index.md` — a 3-section, 5-article miniature mirroring the real format. Then:
```ts
import { describe, it, expect } from "vitest";
import { parseIndexSections } from "./discovery";
import { readFileSync } from "node:fs";

const mini = readFileSync("lib/content/fixtures/mini-index.md", "utf8");

describe("parseIndexSections", () => {
  it("returns sections in document order", () => {
    const s = parseIndexSections(mini);
    expect(s.map((x) => x.heading)).toEqual(["Data Structures", "Algorithms", "Patterns"]);
  });
  it("lists articles under each section with resolved paths", () => {
    const s = parseIndexSections(mini);
    expect(s[0].articles[0]).toMatchObject({ title: expect.any(String), path: expect.stringMatching(/\.md$/) });
  });
  it("ignores non-article links", () => {
    const s = parseIndexSections(mini);
    const allPaths = s.flatMap((x) => x.articles.map((a) => a.path));
    expect(allPaths.every((p) => p.startsWith("content/"))).toBe(true);
  });
});
```

- [ ] **Step 6: Run, confirm failure**

Run: `pnpm test lib/content/discovery.test.ts`
Expected: FAIL — `parseIndexSections` not exported.

- [ ] **Step 7: Implement `parseIndexSections` and `discoverArticlePaths`**

In `discovery.ts`: parse the index markdown with `unified` + `remark-parse` (install: `pnpm add -D unified remark-parse remark-gfm mdast-util-to-string unist-util-visit`), walk headings and the lists/tables beneath them, resolve each relative link against the vertical's directory to a repo-relative `content/...md` path. `discoverArticlePaths(verticalId)` flattens the section list to an ordered path array. Learning-path table rows are parsed here too (needed for `VerticalIndex.learningPaths` and `cutover.md`'s progress bars).

- [ ] **Step 8: Run, confirm pass**

Run: `pnpm test lib/content/discovery.test.ts`

- [ ] **Step 9: Write failing tests for `loadArticle` against fixtures**

Fixtures: `lib/content/fixtures/article-basic.md` (H1 + a few H2/H3, one code block, one table), `article-stub.md` (< 5000 bytes, mostly HTML-comment scaffolding), `article-prereqs.md` (has a `## Prerequisites` section with a `Must`/`Should` list). Then `lib/content/article.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { loadArticle } from "./article";

describe("loadArticle", () => {
  it("derives title from the leading H1", () => {
    expect(loadArticle("lib/content/fixtures/article-basic.md").title).toBe("Basic Article");
  });
  it("marks a sub-threshold file as a stub", () => {
    expect(loadArticle("lib/content/fixtures/article-stub.md").isStub).toBe(true);
  });
  it("does not mark a real article as a stub", () => {
    expect(loadArticle("lib/content/fixtures/article-basic.md").isStub).toBe(false);
  });
  it("parses Must/Should prerequisites with resolved hrefs", () => {
    const a = loadArticle("lib/content/fixtures/article-prereqs.md");
    expect(a.prerequisites).toContainEqual(
      expect.objectContaining({ level: "Must", href: expect.stringMatching(/\.md$/) }),
    );
  });
  it("computes byteSize as raw markdown length", () => {
    expect(loadArticle("lib/content/fixtures/article-basic.md").byteSize).toBeGreaterThan(0);
  });
  it("derives verticalId and slug from the path", () => {
    const a = loadArticle("content/dsa/patterns/sliding-window.md");
    expect(a.verticalId).toBe("dsa");
    expect(a.slug).toEqual(["patterns", "sliding-window"]);
  });
});
```

- [ ] **Step 10: Run, confirm failure**

Run: `pnpm test lib/content/article.test.ts`
Expected: FAIL — `loadArticle` not defined.

- [ ] **Step 11: Implement `loadArticle`**

Install: `pnpm add -D gray-matter`. In `article.ts`:
- Read the file, `gray-matter` it (frontmatter optional, almost always absent).
- `byteSize` = `Buffer.byteLength(rawMarkdown)`.
- `isStub` = `byteSize < STUB_THRESHOLD` where `export const STUB_THRESHOLD = 5000;` lives in `lib/content/constants.ts` with a one-line comment matching `js/state.js`.
- `title` = text of the first `# ` heading (via `remark-parse` + `mdast-util-to-string`), fallback to the filename humanised.
- `slug` = path segments under the vertical dir, last one minus `.md`.
- `verticalId` = first path segment under `content/`.
- `prerequisites` = find the `## Prerequisites` heading, read the list beneath, each item: extract link → `href` (resolved), text → `title`, a leading `Must`/`Should` token → `level`. Port the `PREREQ_LEVEL_RE` logic from `js/content/formatting.js`.

- [ ] **Step 12: Run, confirm pass**

Run: `pnpm test lib/content/article.test.ts`

- [ ] **Step 13: Wire `getVerticals()` (interim, without articleCount)**

In `lib/content/index.ts`, export `getVerticals()` returning the registry with `articleCount: 0` placeholder and a one-line comment "// articleCount filled by the manifest in Phase 6". `getVertical(id)` filters it. Run `pnpm typecheck`.

**Exit criteria:** `pnpm test lib/content/` green. `discoverArticlePaths` and `loadArticle` work on fixtures. `parseIndexSections` handles both real `index.md` files without error (add one test that runs it on each real file and asserts a non-empty section list).

---

## Phase 3 — The `unified` pipeline (standard chain)

**Goal:** `renderMarkdown(md: string, ctx: RenderContext): { html: string }` running the full standard remark/rehype chain from spec §5/§6 — parse, GFM, math, slug, autolink headings, KaTeX, Shiki, stringify. Custom app-dialect plugins are Phase 4; this phase is the off-the-shelf spine only.

**Files:**
- Create: `lib/content/pipeline.ts` — the processor factory
- Create: `lib/content/pipeline.test.ts`
- Create: `lib/content/constants.ts` (if not already from Phase 2)

**Interfaces:**
- Consumes: `types.ts`, `constants.ts`
- Produces: `createProcessor(ctx: RenderContext)` returning a frozen `unified` processor; `renderMarkdown(md, ctx): Promise<{ html: string }>`
- `RenderContext` = `{ articlePath: string; verticalId: string; allArticlePaths: Set<string> }` — the last field feeds Phase 7 link validation

- [ ] **Step 1: Install the standard chain**

Run: `pnpm add -D remark-rehype remark-math rehype-katex katex rehype-slug rehype-autolink-headings rehype-stringify rehype-raw @shikijs/rehype shiki`
`katex` is needed for its stylesheet (imported in the root layout in `app-skeleton.md`).

- [ ] **Step 2: Write failing tests for the standard transforms**

`lib/content/pipeline.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./pipeline";

const ctx = { articlePath: "content/dsa/x.md", verticalId: "dsa", allArticlePaths: new Set(["content/dsa/x.md"]) };

describe("standard pipeline", () => {
  it("renders GFM tables", async () => {
    const { html } = await renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |", ctx);
    expect(html).toContain("<table>");
  });
  it("renders fenced code with Shiki highlighting", async () => {
    const { html } = await renderMarkdown("```js\nconst x = 1;\n```", ctx);
    expect(html).toMatch(/<pre[^>]*shiki/);
  });
  it("renders block math with KaTeX", async () => {
    const { html } = await renderMarkdown("$$\\frac{a}{b}$$", ctx);
    expect(html).toContain("katex");
  });
  it("renders inline math", async () => {
    const { html } = await renderMarkdown("the value $x^2$ here", ctx);
    expect(html).toContain("katex");
  });
  it("adds slug ids to headings", async () => {
    const { html } = await renderMarkdown("## Big Section", ctx);
    expect(html).toContain('id="big-section"');
  });
  it("adds an autolink anchor to headings", async () => {
    const { html } = await renderMarkdown("## Big Section", ctx);
    expect(html).toMatch(/<a[^>]+href="#big-section"/);
  });
  it("renders math nested inside a raw HTML block", async () => {
    const { html } = await renderMarkdown('<div class="note">\n\ninline $x^2$ and\n\n$$\\frac{a}{b}$$\n\n</div>', ctx);
    expect(html).toContain("katex");
    expect(html).toContain('class="note"');
  });
});
```
The last case guards the `remark-rehype` → `rehype-raw` → `rehype-katex` ordering — real articles put `$…$` inside `<div>` blocks, and `rehype-katex` must see the math after `rehype-raw` has reparsed the embedded HTML.

- [ ] **Step 3: Run, confirm failure**

Run: `pnpm test lib/content/pipeline.test.ts`
Expected: FAIL — `renderMarkdown` not defined.

- [ ] **Step 4: Implement the processor**

`pipeline.ts`:
```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import type { RenderContext } from "./types";

export function createProcessor(ctx: RenderContext) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    // Phase 4 custom remark plugins slot in here
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    // Phase 4 custom rehype plugins slot in here
    .use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .freeze();
}

export async function renderMarkdown(md: string, ctx: RenderContext): Promise<{ html: string }> {
  const file = await createProcessor(ctx).process(md);
  return { html: String(file) };
}
```
`rehype-raw` is included because today's articles contain literal HTML (`<!-- tabs -->` comments, `<div>` blocks) that Showdown passes through — the pipeline must too. One-line comment marks the two slots where Phase 4 plugins insert.

`@shikijs/rehype` with `themes: { light, dark }` emits **dual-theme output** — inline `color` for light plus `--shiki-dark` custom properties — not an active dark mode. A small CSS block must activate the dark values under the app's dark theme. Add to `mermaid-spike-result.md`'s sibling notes (or directly to `app-skeleton.md` Phase 3): under `:root[data-theme="dark"]` / the dark media query, `.shiki, .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }`. Without it, code blocks stay light-themed in dark mode. Flag this in Step 6.

- [ ] **Step 5: Run, confirm pass**

Run: `pnpm test lib/content/pipeline.test.ts`

- [ ] **Step 6: Math equivalence check against Showdown (spec §12 risk)**

Write `tests/content/math-equivalence.test.ts`: for a curated set of ~15 math expressions pulled from real articles (grep `\$\$` and inline `$...$` across `content/**`), render each through the new pipeline and assert the KaTeX output is present and well-formed. Where the old custom `$$` extension in `js/state.js` did something non-standard (it base64-rountrips content), note any expression that renders differently in a `math-discrepancies.md` note for content-side fixing. This is not a byte-diff — it is "does KaTeX produce valid output for every real expression".

- [ ] **Step 7: Run the math check**

Run: `pnpm test tests/content/math-equivalence.test.ts`
Expected: PASS, with any discrepancies logged (not failing the suite unless KaTeX throws).

- [ ] **Step 8: Record the Shiki dark-theme CSS requirement**

Add a one-line note to `docs/_meta/plans/nextjs-migration/shiki-dark-css.md` (kept): the dual-theme Shiki output needs `.shiki, .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }` under the dark theme selector. `app-skeleton.md` Phase 3 adds this block to `css/view-content/code.css` (not `tokens.css` — it is a rule, not a token). Confirm the exact custom-property names `@shikijs/rehype` emits for the chosen version (`--shiki-dark` / `--shiki-dark-bg` at time of writing).

**Exit criteria:** `renderMarkdown` runs the full standard chain. All Phase 3 tests green (including math-inside-raw-HTML). Math-equivalence check passes with discrepancies (if any) documented for content fixes. Shiki dark-CSS requirement recorded for `app-skeleton.md`.

---

## Phase 4 — Custom app-dialect plugins (one per markup transform)

**Goal:** port the **markup-producing** half of the vanilla `js/content/*.js` files as remark/rehype plugins. Each plugin gets a fixture test before app code depends on it (spec §12). The **interaction** half of these files stays for `cutover.md` islands — do NOT port it here.

**The split (spec §5 Sub-spec 1):**

| Plugin | Ports the markup from | Produces | Runtime half (→ `cutover.md` island, NOT here) |
| --- | --- | --- | --- |
| `remark-section-wrap` | `js/content/section-wrap.js` | flat heading-siblings → nested `.section` / `.section-body` / `.subsection` / `.subsection-body` containers | none — pure structure |
| `remark-callouts` | `js/content/formatting.js` (callout syntax) | `:::note` / `:::warning` / … → `<div class="callout callout--note">` with a `data-collapsible` flag | collapse toggle |
| `rehype-prerequisites` | `js/content/formatting.js` `renderPrerequisites` | `## Prerequisites` + UL → `.prereqs-container` with `.prereq-chip` (or `.prereq-chip--unlinked`) per item, `data-prereq-path` for completion lookup | completion-state class (client, needs `wiki-be` data) |
| `remark-tabbed-code` | `js/content/formatting.js` `addTabbedCodeBlocks` | `<!-- tabs id -->` / `<!-- /tabs -->` → `<div class="tabbed-code" data-tabs-id>` wrapping the `<pre>`s | tab switching |
| `remark-footnotes` | `js/content/formatting.js` `addFootnotes` — but prefer `remark-gfm`'s native footnotes | `[^label]` → `<sup class="footnote-ref">`, `[^label]:` → definition list at end | none — `remark-gfm` handles it; only add a shim if real articles use a syntax GFM misses |
| `remark-viz` | `js/content/structure-viz.js` | ` ```viz ` (line 1 = type, line 2 = JSON array) → inline SVG (`.structure-viz` wrapper, `data-viz-type`), raw block left as fallback on parse failure | none — deterministic render |
| `remark-video-embed` | `js/content/video-embed.js` | bare YouTube/Vimeo URL alone in a paragraph → `.video-embed > iframe` (lazy, no-cookie where possible) | none |
| `remark-practice-answer` | `js/content/practice-toggle.js` `_wrapAnswer` | DSA h3 → complexity run wrapped in `<div class="problem-answer" hidden>` | the eye-button toggle |
| `rehype-glossary-caveat-markers` | `js/content/glossary-caveats.js` (marker creation only) | `[?caveat text]` → `<span class="caveat-marker">` + hidden `.caveat-body`; `<abbr>` matching a glossary key → `.glossary-term` | popover / reveal behaviour |
| `rehype-comparison-table` | `js/content/tables.js` (markup + column metadata only) | detect a comparison/complexity table → add `data-comparison`, per-column `data-col-key`, mark numeric columns | sort, column-toggle, scroll-cue |
| `rehype-code-header` | `js/content/code-blocks.js` (markup only) | wrap each `<pre>` with a header element (traffic lights, lang label, copy-button placeholder), add `data-code-origin` (the `from: <title> · <wiki>` string), split lines into `.code-line` spans + `has-line-numbers` class | copy-to-clipboard wiring |

**Do NOT port** the ~600 runtime lines of `formatting.js` (LaTeX `αβ` toggle, focus mode, study/hide-reveal, in-article find) — those are `cutover.md` islands.

**Files:**
- Create: `lib/content/plugins/<name>.ts` — one file per plugin
- Create: `lib/content/plugins/<name>.test.ts` — one fixture test file per plugin
- Modify: `lib/content/pipeline.ts` — insert plugins at the two marked slots, in the correct order
- Create: `lib/content/plugins/fixtures/` — markdown snippets per plugin

**Interfaces:**
- Consumes: `pipeline.ts` slots, `types.ts`
- Produces: each plugin as a `unified` plugin; `pipeline.ts` updated so `renderMarkdown` emits the full app dialect

**Plugin ordering (critical — from `content-view.js` pipeline order):**
1. `remark-*` phase: `remark-video-embed` → `remark-viz` → `remark-tabbed-code` → `remark-callouts` → `remark-practice-answer` → `remark-section-wrap` (LAST in remark — it wraps everything the others produced; `renderPrerequisites`, practice-answer, study-mode all rely on `.section-body`/`.subsection-body` existing)
2. `remark-rehype` boundary
3. `rehype-*` phase: `rehype-prerequisites` → `rehype-comparison-table` → `rehype-code-header` → `rehype-glossary-caveat-markers` (after slug/autolink, before stringify)

For each plugin below, the step pattern is identical — shown fully for the first, then per-plugin specifics. **Repeat all five steps for every plugin; do not write "same as above".**

### Task 4a: `remark-section-wrap`

- [ ] **Step 1: Write the failing fixture test**

`lib/content/plugins/fixtures/section-wrap.md`:
```
# Title

## Section One

Para under section one.

### Subsection A

Para under subsection A.

## Section Two

Para under section two.
```
`lib/content/plugins/section-wrap.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../pipeline";
import { readFileSync } from "node:fs";

const md = readFileSync("lib/content/plugins/fixtures/section-wrap.md", "utf8");
const ctx = { articlePath: "content/dsa/x.md", verticalId: "dsa", allArticlePaths: new Set<string>() };

describe("remark-section-wrap", () => {
  it("wraps each H2 run in a .section with a .section-body", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect((html.match(/class="section"/g) ?? []).length).toBe(2);
    expect(html).toContain('class="section-body"');
  });
  it("wraps H3 runs in a .subsection with a .subsection-body", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('class="subsection"');
    expect(html).toContain('class="subsection-body"');
  });
  it("keeps the H1 outside any section", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>\s*<div class="section"/);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm test lib/content/plugins/section-wrap.test.ts`
Expected: FAIL — no `.section` wrappers (plugin not wired).

- [ ] **Step 3: Implement `lib/content/plugins/section-wrap.ts`**

A remark plugin operating on the mdast tree: walk top-level children, group each `heading[depth=2]` with all following nodes until the next depth-2 heading into a synthetic container node (emit as an `mdast` `html` node pair, or better, a `hast`-friendly node via a small `remark-rehype` handler). Within each section, do the same for `heading[depth=3]`. Port the `_collectUntil` / `_wrapRun` logic from `js/content/section-wrap.js`. One-line comments only.

- [ ] **Step 4: Wire it into `pipeline.ts` (last in the remark phase) and run**

Run: `pnpm test lib/content/plugins/section-wrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full pipeline suite to check nothing regressed**

Run: `pnpm test lib/content/pipeline.test.ts lib/content/plugins/`
Expected: all green.

### Task 4b: `remark-callouts`

- [ ] **Step 1: Failing fixture test** — `fixtures/callouts.md` with `:::note`, `:::warning`, `:::tip`, and a collapsible variant (`:::note collapsed`). Assert `<div class="callout callout--note">`, `callout--warning`, and `data-collapsible="true"` on the collapsed one. Assert the callout title/first-line handling matches today's output.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/callouts.ts`** — port the callout syntax regex + variant list from `js/content/formatting.js`. Emit the wrapper div; a `collapsed`/`collapsible` token sets `data-collapsible`. The collapse *toggle* is a `cutover.md` island — the plugin only emits markup + the data attribute.
- [ ] **Step 4: Wire into `pipeline.ts` (remark phase, before section-wrap), run, confirm pass.**
- [ ] **Step 5: Full pipeline + plugins suite green.**

### Task 4c: `remark-viz`

- [ ] **Step 1: Failing fixture test** — `fixtures/viz.md` with a valid `bst` block (`[8,3,10,1,6]`), a valid `array` block, and a malformed block (bad JSON). Assert `.structure-viz` wrapper + `data-viz-type="bst"` + an inline `<svg>` for the valid ones; assert the malformed block is left as a `<pre>` fallback.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/viz.ts`** — port `_parseVizBlock` and the `RENDERERS` map (`bst`, `heap`, `linked-list`, `array`) from `js/content/structure-viz.js`. Server-side SVG generation uses string templates, not `document.createElementNS` — rewrite the `_svgEl` helper to emit SVG markup strings. Constants (`NODE_R`, `LEVEL_H`, `MAX_VIZ_NODES`, etc.) carried over verbatim.
- [ ] **Step 4: Wire into `pipeline.ts` (remark phase, early), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4d: `remark-video-embed`

- [ ] **Step 1: Failing fixture test** — `fixtures/video.md` with a bare `youtube.com/watch?v=`, a `youtu.be/`, a `vimeo.com/123`, and a URL inside a sentence (must NOT embed). Assert `.video-embed > iframe` with the correct `src` for the three bare ones; assert the in-sentence URL stays a link/text.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/video-embed.ts`** — port `YOUTUBE_RE`, `VIMEO_RE`, `embedUrlFor` from `js/content/video-embed.js`. Operate on paragraph nodes whose sole content is a bare URL. Emit the wrapper + iframe markup.
- [ ] **Step 4: Wire in (remark phase, first), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4e: `remark-tabbed-code`

- [ ] **Step 1: Failing fixture test** — `fixtures/tabbed-code.md` with `<!-- tabs id="ex1" title="Example" -->`, two fenced code blocks, `<!-- /tabs id="ex1" -->`. Assert `<div class="tabbed-code" data-tabs-id="ex1" data-tabs-title="Example">` wrapping both `<pre>`s. Assert a single code block inside tabs is left ungrouped (matches `pres.length < 2` guard).
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/tabbed-code.ts`** — port the `tabsExtension` regex from `js/state.js` and the `addTabbedCodeBlocks` grouping from `js/content/formatting.js`. Markup only — tab switching is a `cutover.md` island.
- [ ] **Step 4: Wire in (remark phase), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4f: `remark-practice-answer`

- [ ] **Step 1: Failing fixture test** — `fixtures/practice.md` mirroring a DSA problem: `### Problem N`, an `Approach` paragraph, a `Complexity` line. Assert the Approach→Complexity run is wrapped in `<div class="problem-answer" hidden>`. Assert content before `Approach` is untouched.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/practice-answer.ts`** — port `_wrapAnswer`, `COMPLEXITY_RE`, `_labelText` from `js/content/practice-toggle.js`. Runs after section-wrap so `.subsection-body` exists. Emits the wrapper with `hidden`; the eye-button toggle is a `cutover.md` island.
- [ ] **Step 4: Wire in (remark phase, before section-wrap), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4g: `rehype-prerequisites`

- [ ] **Step 1: Failing fixture test** — reuse `article-prereqs.md`. Assert `.prereqs-container` with a `.prereqs-label`, one `.prereq-chip` per item, `.prereq-chip--unlinked` for the linkless one, `data-prereq-path` carrying the resolved `content/...md` path on linked chips, and the `Must`/`Should` status marker element present.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/prerequisites.ts`** — a rehype plugin (runs on hast, after section-wrap has produced `.section`). Port `renderPrerequisites` + `PREREQ_LEVEL_RE` + `appendChipStatus` markup from `js/content/formatting.js`. The completion-state class (`done`) is NOT set here — that needs `wiki-be` data at runtime; emit `data-prereq-path` and let the `cutover.md` island add the class.
- [ ] **Step 4: Wire into `pipeline.ts` (rehype phase, first), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4h: `rehype-comparison-table`

- [ ] **Step 1: Failing fixture test** — `fixtures/comparison-table.md` with a complexity table (Big-O cells) and a plain data table. Assert the complexity table gets `data-comparison` (or the class today's code uses), per-`<th>` `data-col-key`, and numeric/Big-O columns marked; assert the plain table is untouched or minimally marked per today's behaviour.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/comparison-table.ts`** — port `isComplexityTable`, `COMPLEXITY_HEADER_RE`, `BIG_O_RE`, `WHOLE_CELL_NUM_RE` from `js/content/tables.js`. Emit only the structural markup + column metadata the sort/toggle island will read. Quiz-me mode is DROPPED (spec §9) — do NOT emit `.quiz-table`/`.quiz-cell`.
- [ ] **Step 4: Wire into `pipeline.ts` (rehype phase), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4i: `rehype-code-header`

- [ ] **Step 1: Failing fixture test** — `fixtures/code-header.md` with a `js` block (5+ lines) and a `python` block (2 lines). Assert each `<pre>` is wrapped with a header element (traffic-light markup, lang label), `data-code-origin` present, `.code-line` spans + `has-line-numbers` on the 5-line block but NOT the 2-line one (matches `lines.length < 3` guard), and `language-mermaid` blocks skipped.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/code-header.ts`** — port `addCodeBlockHeader` markup, `HASH_COMMENT_LANGS`, the `from: <origin>` prefix builder, `splitHighlightedLines` + `addLineNumbers` from `js/content/code-blocks.js`. Runs AFTER `rehype-shiki` so highlighted spans exist to split. The copy button is a placeholder element with a `data-copy-target`; wiring is a `cutover.md` island. `data-code-origin` uses `ctx.articlePath` → title + vertical title.
- [ ] **Step 4: Wire into `pipeline.ts` (rehype phase, after Shiki), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4j: `rehype-glossary-caveat-markers`

- [ ] **Step 1: Failing fixture test** — `fixtures/glossary-caveat.md` with `[?a short caveat]` inline text and an `<abbr title="...">TERM</abbr>` where `term` is a glossary key. Provide a stub glossary via `ctx`. Assert `[?...]` → `.caveat-marker` + hidden `.caveat-body`; assert the `<abbr>` gets `.glossary-term` + `role="button"` + `aria-expanded="false"` and a hidden `.glossary-inline-def`.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `plugins/glossary-caveat-markers.ts`** — port `CAVEAT_RE` and the marker/`.caveat-body` creation from `js/content/glossary-caveats.js`, plus the `<abbr>` → `.glossary-term` markup from `addInlineGlossaryExpand`. Glossary lookup data comes from `ctx` (the loader reads `data/glossary.json` at build). NO popover positioning, NO reveal handlers — those are `cutover.md` islands. Extend `RenderContext` with `glossary: Record<string, string>`.
- [ ] **Step 4: Wire into `pipeline.ts` (rehype phase, last before stringify), run, confirm pass.**
- [ ] **Step 5: Full suite green.**

### Task 4k: footnotes decision

- [ ] **Step 1: Check whether `remark-gfm` covers real footnote usage**

Grep `content/**` for `[^` footnote syntax. Render 3 real articles that use footnotes through the current pipeline (`remark-gfm` has native footnote support). Compare to `js/content/formatting.js` `addFootnotes` output.

- [ ] **Step 2: Decide**

- If `remark-gfm` output is equivalent → no plugin needed; delete this task, note "footnotes: handled by remark-gfm" in `pipeline.ts`.
- If real articles use a syntax GFM misses → write `plugins/footnotes.ts` following the 5-step pattern, porting `addFootnotes`.

**Exit criteria:** every plugin has a green fixture test. `renderMarkdown` on `fixtures/article-basic.md` produces markup structurally matching today's post-processed output (add one test that renders a fixture combining callouts + prereqs + code + a table + a viz block and asserts every wrapper class is present). Plugin order documented in a one-line comment in `pipeline.ts`. No runtime-behaviour code ported.

---

## Phase 5 — Article assembly: headings, excerpt, fingerprint, reading time

**Goal:** `getArticle(vertical, slug)` returns a complete `Article` — Phase 2's partial model + Phase 3/4's `html` + the derived fields (`headings`, `excerpt`, `shapeFingerprint`, `readingTimeMin`).

**Files:**
- Create: `lib/content/toc.ts` — heading-tree extraction from hast
- Create: `lib/content/derive.ts` — excerpt, fingerprint, reading time
- Modify: `lib/content/article.ts` / `lib/content/index.ts` — assemble and export `getArticle`
- Create: `lib/content/toc.test.ts`, `lib/content/derive.test.ts`, `lib/content/get-article.test.ts`

**Interfaces:**
- Consumes: Phase 2 `loadArticle`, Phase 3/4 `renderMarkdown` / processor
- Produces: `getArticle(vertical, slug): Article | undefined`, `getArticleSlugs(): {vertical,slug}[]`, `extractHeadings(hast): Heading[]`, `computeShapeFingerprint(hast): ShapeFingerprint`

- [ ] **Step 1: Failing test for `extractHeadings`**

`toc.test.ts` — render a fixture with H2/H3/H4, assert `extractHeadings` returns `[{depth:2,text:"...",id:"..."}]` in document order, ids matching `rehype-slug` output, H1 excluded.

- [ ] **Step 2: Run, confirm failure.**

- [ ] **Step 3: Implement `extractHeadings`** — run a `unified` processor up to hast (reuse `createProcessor` but capture the tree via a transformer), `unist-util-visit` for `element` nodes with `tagName` in `h2/h3/h4`, read `properties.id` and text content. Port the heading-tree shape `js/content/toc.js` `buildTOC` expects.

- [ ] **Step 4: Run, confirm pass.**

- [ ] **Step 5: Failing test for `computeShapeFingerprint`**

`derive.test.ts` — assert `{ headings, codeBlocks, tables, paragraphs }` counts for a known fixture. Cross-check against `js/render/content-view.js` `buildLoadingSkeleton` which reads `fingerprint.headings` / `fingerprint.codeBlocks` — those two fields must exist with those names.

- [ ] **Step 6: Run, confirm failure.**

- [ ] **Step 7: Implement `computeShapeFingerprint`** — visit the hast, count `h2/h3/h4`, `pre`, `table`, `p`. Port the fingerprint fields from `js/state.js` `getShapeFingerprint` / `saveShapeFingerprint` (check exact field names in `state.js` and match them).

- [ ] **Step 8: Failing test for `excerpt` and `readingTimeMin`**

Assert `excerpt` = first non-empty paragraph text, plain (no tags), trimmed to a sentence or ~200 chars; assert a stub returns `readingTimeMin: 0`; assert a long article returns a plausible minute count. Port `readingTime` from `js/render/nav-utils.js` (check its words-per-minute constant and match it).

- [ ] **Step 9: Run, confirm failure.**

- [ ] **Step 10: Implement `excerpt` + `readingTimeMin` in `derive.ts`.**

- [ ] **Step 11: Run, confirm pass.**

- [ ] **Step 12: Failing test for `getArticle` end-to-end**

`get-article.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getArticle, getArticleSlugs } from "./index";

describe("getArticle", () => {
  it("returns a complete Article for a real path", async () => {
    const a = await getArticle("dsa", ["patterns", "sliding-window"]);
    expect(a).toBeDefined();
    expect(a!.html).toContain("<");
    expect(a!.headings.length).toBeGreaterThan(0);
    expect(a!.title).toBeTruthy();
    expect(typeof a!.readingTimeMin).toBe("number");
  });
  it("returns undefined for an unknown slug", async () => {
    expect(await getArticle("dsa", ["nope", "nothing"])).toBeUndefined();
  });
  it("getArticleSlugs covers every discovered article", async () => {
    const slugs = await getArticleSlugs();
    expect(slugs.length).toBeGreaterThan(150);
  });
});
```
(Adjust the `sliding-window` path to a real article confirmed to exist.)

- [ ] **Step 13: Run, confirm failure.**

- [ ] **Step 14: Implement `getArticle` + `getArticleSlugs`** — `getArticleSlugs` maps `discoverArticlePaths` over both verticals. `getArticle` resolves `vertical`+`slug` → path, `loadArticle`, `renderMarkdown` with the real `RenderContext` (`allArticlePaths` = the full discovered set, `glossary` loaded from `data/glossary.json`), then `extractHeadings` / `computeShapeFingerprint` / `derive`. Memoize per path (build runs call it many times).

- [ ] **Step 15: Run, confirm pass.**

**Exit criteria:** `getArticle` returns a schema-valid `Article` for every real slug. `pnpm test lib/content/` green.

---

## Phase 6 — `manifest.json` generator

**Goal:** one build step emits `manifest.json` — every article's metadata (no `html`), plus derived `articleCount` per vertical. Drives search, hover-previews, index views, related-articles, changelog resolution.

**Files:**
- Create: `lib/content/manifest.ts` — `buildManifest()` + `getManifest()`
- Create: `lib/content/build.ts` — the single entry point CI calls (`next build` will call this; for now it is standalone)
- Create: `lib/content/manifest.test.ts`, `tests/content/manifest-schema.test.ts`
- Create: `lib/content/manifest.schema.ts` — a zod (or hand-rolled) schema

**Interfaces:**
- Consumes: Phase 5 `getArticle`, `getArticleSlugs`, Phase 2 registry
- Produces: `buildManifest(): Manifest`, `getManifest(): Manifest` (reads the emitted file, or builds on demand in dev), `manifest.json` written to a path both the Node build and Next can read (decide: `lib/content/generated/manifest.json`, git-ignored, rebuilt each `next build`)

- [ ] **Step 1: Install a schema validator**

Run: `pnpm add -D zod`

- [ ] **Step 2: Write `manifest.schema.ts`** — a zod schema matching the `Manifest` / `Article` (sans `html`) / `Vertical` interfaces from the top of this file.

- [ ] **Step 3: Failing test for `buildManifest`**

`manifest.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildManifest } from "./manifest";

describe("buildManifest", () => {
  it("includes every discovered article", async () => {
    const m = await buildManifest();
    expect(m.articles.length).toBeGreaterThan(150);
  });
  it("omits html from manifest articles", async () => {
    const m = await buildManifest();
    expect((m.articles[0] as Record<string, unknown>).html).toBeUndefined();
  });
  it("derives articleCount per vertical from non-stub articles", async () => {
    const m = await buildManifest();
    const dsa = m.verticals.find((v) => v.id === "dsa")!;
    expect(dsa.articleCount).toBeGreaterThan(0);
  });
  it("every article has a heading tree and excerpt", async () => {
    const m = await buildManifest();
    for (const a of m.articles) {
      expect(Array.isArray(a.headings)).toBe(true);
      expect(typeof a.excerpt).toBe("string");
    }
  });
});
```
Note the `articleCount` semantics: spec §4 says it is derived; check whether today's count is total-articles or non-stub-articles (grep `articleCount` usage in `js/render/home-parse.js` / `home-index.js`) and match that exactly.

- [ ] **Step 4: Run, confirm failure.**

- [ ] **Step 5: Implement `buildManifest`** — iterate `getArticleSlugs`, `getArticle` each, strip `html`, collect. Compute `articleCount` per the semantics confirmed in Step 3. Attach `generatedAt`.

- [ ] **Step 6: Run, confirm pass.**

- [ ] **Step 7: Failing schema test**

`tests/content/manifest-schema.test.ts` — `buildManifest()` then `manifestSchema.parse(m)`; assert no throw.

- [ ] **Step 8: Run, confirm failure, then implement the file write in `build.ts` and `getManifest` read path, run, confirm pass.**

- [ ] **Step 9: Wire `getVerticals()` to real `articleCount`** — `getVerticals()` now reads `getManifest().verticals`. Update the Phase 2 placeholder. Re-run `lib/content/` suite.

- [ ] **Step 10: Add `getVerticalIndex(id)`** — combines `parseIndexSections` (Phase 2) with manifest data (stub flags, resolved slugs) and the parsed learning-path tables. Test: assert sections non-empty, every article cross-referenced to the manifest, learning paths parsed. This is what `app-skeleton.md`'s `/{vertical}` route renders.

**Exit criteria:** `manifest.json` emitted and schema-valid. `articleCount` derived and matching today's semantics. `getVerticals()` / `getManifest()` / `getVerticalIndex()` all backed by real data. Suite green.

---

## Phase 7 — Cross-link validation + search-index + backlinks + broken-links + bridges

**Goal:** fold the four Python generators into the Node content build. One `buildContent()` produces manifest + `search-index.json` + `backlinks.json` + `broken-links.json` + bridges validation + two derived assets the `cutover.md` / `post-cutover.md` islands need (`previews.json`, `complexity-tables.json`). Output must be **semantically equivalent** to the Python output (spec §12) — not byte-identical.

**Files:**
- Create: `lib/content/links.ts` — link extraction + validation
- Create: `lib/content/search-index.ts` — port of `scripts/build_search_index.py`
- Create: `lib/content/backlinks.ts` — port of `scripts/build_backlinks.py`
- Create: `lib/content/broken-links.ts` — port of `scripts/build_broken_links.py`
- Create: `lib/content/bridges.ts` — port of `scripts/validate_bridges.py`
- Create: `lib/content/previews.ts` — emit `previews.json` (slug → `{ title, excerpt }`) for hover-previews (`cutover.md` Phase 4)
- Create: `lib/content/complexity-tables.ts` — emit `complexity-tables.json` (DS-section slug → parsed Big-O table) for the comparator (`post-cutover.md` Phase 3)
- Modify: `lib/content/build.ts` — `buildContent()` runs all of it
- Create: `tests/content/equivalence.test.ts` — deep-compare Node vs Python output
- Create: `lib/content/links.test.ts`, `lib/content/search-index.test.ts`, `lib/content/backlinks.test.ts`, `lib/content/previews.test.ts`, `lib/content/complexity-tables.test.ts`

**Interfaces:**
- Consumes: Phase 5/6
- Produces: `validateLinks(): LinkError[]`, `buildSearchIndex()`, `buildBacklinks()`, `buildBrokenLinks()`, `validateBridges()`, `buildPreviews()`, `buildComplexityTables()`, `getBacklinks(targetPath)`, `getRelated(vertical, slug)`, `buildContent()` (the CI entry point)

- [ ] **Step 1: Read all four Python scripts in full** — `scripts/build_search_index.py`, `scripts/build_backlinks.py`, `scripts/build_broken_links.py`, `scripts/validate_bridges.py`. Document each one's output shape (keys, nesting, value types) in a one-line comment at the top of the corresponding new `.ts` file. Note the input each reads (`build_backlinks.py` reads `search-index.json`).

- [ ] **Step 2: Generate the Python reference output** — run each script via `.venv/bin/python3 scripts/build_search_index.py` etc. Copy the current `content/search-index.json`, `content/backlinks.json`, `content/broken-links.json`, `content/bridges.json` to `tests/content/reference/` as the equivalence baseline.

- [ ] **Step 3: Failing test for `validateLinks`**

`links.test.ts` — a fixture article linking to `./exists.md` (present) and `./missing.md` (absent) and a cross-vertical `../system-design/foo.md`. Assert `validateLinks` flags `missing.md` and the bad cross-vertical link, passes the good ones.

- [ ] **Step 4: Run, confirm failure.**

- [ ] **Step 5: Implement `links.ts`** — walk every article's mdast/hast for `link` nodes with a `.md` target (and `#anchor` fragments), resolve against the article's dir, check membership in `allArticlePaths` (and, for anchors, against that target's `headings`). Return structured errors. This replaces the lychee pre-commit hook (spec §5) with an unskippable build check.

- [ ] **Step 6: Run, confirm pass.**

- [ ] **Step 7: Failing equivalence test for the search index**

`tests/content/equivalence.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildSearchIndex } from "../../lib/content/search-index";

function normalize(obj: unknown): unknown {
  // recursively sort object keys and arrays-of-objects by a stable key so key order and
  // serialization differences between Python json.dumps and JSON.stringify don't matter
  // (implement: sort keys; sort arrays by JSON.stringify of each element)
  return obj; // real impl here
}

describe("search-index equivalence", () => {
  it("matches the Python reference semantically", async () => {
    const nodeOut = await buildSearchIndex();
    const pyOut = JSON.parse(readFileSync("tests/content/reference/search-index.json", "utf8"));
    expect(normalize(nodeOut)).toEqual(normalize(pyOut));
  });
});
```

- [ ] **Step 8: Run, confirm failure.**

- [ ] **Step 9: Implement `search-index.ts`** — port `build_search_index.py` field-for-field. Same entries, same per-entry keys (title, path, headings, excerpt/body, whatever the Python emits), non-stub filter matching the Python behaviour. Serialization differences (key order, whitespace, unicode escaping) are expected and fine.

- [ ] **Step 10: Run the equivalence test, iterate until the normalized deep-compare passes.** Any genuine data difference is a bug to fix in the port; any pure serialization difference the `normalize` function must absorb.

- [ ] **Step 11: Repeat Steps 7–10 for `backlinks.ts`** — port `build_backlinks.py`. It reads the search index, so `buildBacklinks()` takes the Node search-index output as input. Equivalence test against `tests/content/reference/backlinks.json`. Then implement `getBacklinks(targetPath)` (the "Mentioned by" spine reads this) and `getRelated(vertical, slug)` (same-section ranking — port `_rankRelated` from `js/render/related-articles.js`).

- [ ] **Step 12: Repeat Steps 7–10 for `broken-links.ts`** — port `build_broken_links.py`. Equivalence test against `tests/content/reference/broken-links.json`. Note: this overlaps `validateLinks` — `broken-links.json` is the *report* (for the admin view), `validateLinks` is the *build gate*. Share the link-walk, differ in output shape and in whether a finding fails the build.

- [ ] **Step 13: Port `bridges.ts`** — `validate_bridges.py` validates `content/bridges.json` (a hand-authored file). Port the validation logic; emit the same pass/fail + `bridges.json` regeneration if the script regenerates it (check). Equivalence test against `tests/content/reference/bridges.json`.

- [ ] **Step 13a: Implement `previews.ts`** — `buildPreviews()` maps the manifest to `{ "<vertical>/<slug>": { title, excerpt } }` and writes `lib/content/generated/previews.json` (also copied to `public/` in `app-skeleton.md` so the SW can precache it). No Python reference — new derived asset. Test: every non-stub article has an entry; excerpt is plain text, non-empty.

- [ ] **Step 13b: Implement `complexity-tables.ts`** — `buildComplexityTables()` walks the Data-Structures section articles (heading `"Data Structures"` in the DSA index), finds each article's complexity table in its rendered hast (the `[data-comparison]` marker from `rehype-comparison-table`), parses it to `{ operations: string[], cells: Record<operation, bigO> }`, writes `lib/content/generated/complexity-tables.json` keyed by slug. New derived asset — port the cell-parse from `extractComplexityTable` in `js/content/tables.js`. Test: a known DS article (e.g. `hash-table`) produces a table with the expected operations; a DS article with no complexity table is absent from the output, not an error.

- [ ] **Step 14: Implement `buildContent()` in `build.ts`** — runs, in order: discovery → per-article render → `buildManifest` → `buildSearchIndex` → `buildBacklinks` → `buildBrokenLinks` → `validateBridges` → `buildPreviews` → `buildComplexityTables` → `validateLinks` (throws / non-zero exit on link errors). Writes all JSON to `lib/content/generated/`. This is the single function `next build` and CI invoke.

- [ ] **Step 15: Per-diagram SVG cache (spec §7, overview.md CI-cost section)** — add a content-hash cache keyed on `hash(mermaidBlockSource + mermaidVersion + themeCSS)` → rendered SVG, persisted under `lib/content/generated/.mermaid-cache/`. `remark-viz` is deterministic and needs no browser; this cache is for the Phase 4/`app-skeleton` **mermaid** plugin (build-time Chromium render). On a build, unchanged diagram blocks are cache hits. Test: render twice, assert the second run does zero browser launches.

- [ ] **Step 16: Regenerate the committed baseline** — run `buildContent()`, copy its `search-index.json` / `backlinks.json` / `broken-links.json` / `bridges.json` over the committed `content/*.json`. These Node-generated files are the new baseline (spec §12). The Python scripts stay in `scripts/` as the reference until `post-cutover.md` retires them.

**Exit criteria:** `buildContent()` produces all seven outputs (manifest + search-index + backlinks + broken-links + bridges + previews + complexity-tables). Every equivalence test passes (normalized deep-compare, not byte-diff). `previews.json` + `complexity-tables.json` schema-checked. `validateLinks` fails the build on a broken cross-link. Mermaid SVG cache proven to skip unchanged diagrams. `pnpm test` fully green.

---

## Phase 8 — Corpus smoke + exit gate

**Goal:** the spec §5 Sub-spec 1 exit criteria, as an automated gate: every real content file runs through the public `lib/content` functions with zero errors, manifest schema-valid, generators semantically equivalent, link-check green, math diffed, Mermaid spike resolved.

**Files:**
- Create: `tests/content/corpus-smoke.test.ts`
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-1-exit.md` — the signed-off checklist

**Interfaces:**
- Consumes: everything above
- Produces: a green gate authorising `app-skeleton.md` to start

- [ ] **Step 1: Write the corpus smoke test**

`tests/content/corpus-smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getArticleSlugs, getArticle } from "../../lib/content/index";
import { buildManifest } from "../../lib/content/manifest";
import { manifestSchema } from "../../lib/content/manifest.schema";

describe("corpus smoke", () => {
  it("renders every article without throwing", async () => {
    const slugs = await getArticleSlugs();
    const failures: string[] = [];
    for (const { vertical, slug } of slugs) {
      try {
        const a = await getArticle(vertical, slug);
        if (!a || !a.html) failures.push(`${vertical}/${slug.join("/")}`);
      } catch (e) {
        failures.push(`${vertical}/${slug.join("/")}: ${(e as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });
  it("produces a schema-valid manifest", async () => {
    expect(() => manifestSchema.parse(buildManifest())).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it. Fix every failure** — a throw on a real article means a plugin has an edge case (unusual heading nesting, a malformed viz block, an HTML construct `rehype-raw` chokes on). Fix in the plugin, re-run. This is the phase that surfaces real-content surprises.

- [ ] **Step 3: Run the full `pnpm test`** — corpus smoke + all unit + all equivalence + math + schema. Everything green.

- [ ] **Step 4: Run `pnpm typecheck && pnpm lint`** — zero errors across `lib/**` and `tests/content/**`.

- [ ] **Step 5: Fill `sub-spec-1-exit.md`** with evidence against each spec §5 Sub-spec 1 exit criterion:
  - render harness (corpus smoke) — zero errors ✅/❌ + failure list if any
  - `manifest.json` produced + schema-validated ✅/❌
  - `search-index.json` + `backlinks.json` + `broken-links.json` + `bridges.json` semantically equivalent to Python (normalized deep-compare) ✅/❌
  - link-check passes on real content ✅/❌
  - math output diffed vs Showdown, discrepancies resolved or logged ✅/❌ + link to `math-discrepancies.md`
  - Mermaid spike resolved ✅/❌ + link to `mermaid-spike-result.md` (PASS → build-time plugin path; FAIL → documented fallback)

- [ ] **Step 6: Checkpoint** — report the exit checklist. Do not start `app-skeleton.md` until reviewed.

**Exit criteria:** `sub-spec-1-exit.md` is all ✅ (or every ❌ has an explicit accepted-tradeoff note). `lib/content/` is a complete, tested, typed library with the exact public surface `app-skeleton.md` imports. The vanilla app is byte-for-byte untouched — `index.html` + `js/**` + `wiki-sw.js` unchanged.
