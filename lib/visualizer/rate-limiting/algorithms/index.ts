import type { AlgorithmId, LimiterFactory } from "../types";
import { createFixedWindow } from "./fixed-window";
import { createLeakyBucket } from "./leaky-bucket";
import { createSlidingCounter } from "./sliding-counter";
import { createSlidingLog } from "./sliding-log";
import { createTokenBucket } from "./token-bucket";

export const LIMITERS: Record<AlgorithmId, LimiterFactory> = {
  "fixed-window": createFixedWindow,
  "sliding-log": createSlidingLog,
  "sliding-counter": createSlidingCounter,
  "token-bucket": createTokenBucket,
  "leaky-bucket": createLeakyBucket,
};
