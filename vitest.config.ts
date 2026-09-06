import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/content/**/*.test.ts", "app/**/*.test.{ts,tsx}"],
    globalSetup: ["tests/content/global-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    teardownTimeout: 180_000,
    pool: "forks",
    // serial: concurrent forks running the full-corpus render trip vitest 2.1.8's onTaskUpdate RPC timeout
    fileParallelism: false,
    reporters: ["dot"],
    coverage: { provider: "v8", include: ["lib/**"], exclude: ["lib/**/*.test.ts"] },
  },
});
