import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/content/**/*.test.ts"],
    coverage: { provider: "v8", include: ["lib/**"], exclude: ["lib/**/*.test.ts"] },
  },
});
