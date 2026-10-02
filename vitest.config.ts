import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Shared base; projects live in vitest.workspace.ts (Vitest 2.1 workspace API).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["components/**", "jsdom"],
      ["lib/storage/**", "jsdom"],
      ["lib/reader/**", "jsdom"],
      ["lib/toast.test.ts", "jsdom"],
      ["lib/api.test.ts", "jsdom"],
      ["lib/pwa/**", "jsdom"],
      ["lib/search/**", "jsdom"],
      ["lib/auth/**", "jsdom"],
      ["lib/hotkeys.test.ts", "jsdom"],
    ],
    setupFiles: ["tests/setup-dom.ts"],
    pool: "forks",
    reporters: ["dot"],
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
});
