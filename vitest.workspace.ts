import { defineWorkspace } from "vitest/config";

// Pipeline-heavy tests share one fork so Shiki's getSingletonHighlighter cold-starts once.
const PIPELINE_TESTS = [
  "lib/content/pipeline.test.ts",
  "lib/content/plugins/**/*.test.ts",
  "lib/content/get-article.test.ts",
  "app/article.test.tsx",
  "tests/content/math-equivalence.test.ts",
];

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit",
      include: [
        "lib/**/*.test.ts",
        "app/**/*.test.{ts,tsx}",
        "components/**/*.test.{ts,tsx}",
        "tests/content/equivalence.test.ts",
      ],
      // Full-corpus rebuilders → content; Shiki/renderMarkdown suite → pipeline.
      exclude: [
        "lib/content/build.test.ts",
        "lib/content/manifest.test.ts",
        "lib/content/complexity-tables.test.ts",
        "lib/content/previews.test.ts",
        ...PIPELINE_TESTS,
      ],
      fileParallelism: true,
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "pipeline",
      include: PIPELINE_TESTS,
      fileParallelism: false,
      poolOptions: {
        forks: { singleFork: true },
      },
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "content",
      include: ["tests/content/artifacts.test.ts"],
      globalSetup: ["tests/content/global-setup.ts"],
      fileParallelism: false,
      hookTimeout: 600_000,
      teardownTimeout: 180_000,
    },
  },
]);
