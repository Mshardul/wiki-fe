import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/config";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false, // else `next dev` appends its agent-rules block to CLAUDE.md every run
};

export default nextConfig;
