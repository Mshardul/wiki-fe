import type { NextConfig } from "next";
import { BASE_PATH, E2E_BUILD } from "./lib/config";

const nextConfig: NextConfig = {
  output: "export",
  // `page.e2e.tsx` is only a route in an e2e build, so production has no canary route at all.
  pageExtensions: E2E_BUILD ? ["tsx", "ts", "e2e.tsx"] : ["tsx", "ts"],
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false, // else `next dev` appends its agent-rules block to CLAUDE.md every run
};

export default nextConfig;
