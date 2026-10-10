import { cachingModule } from "./caching/module";
import type { VisualizerModule } from "./core/types";
import { evictionModule } from "./eviction/module";
import { rateLimitingModule } from "./rate-limiting/module";

export const MODULES: Record<string, VisualizerModule> = {
  [evictionModule.slug]: evictionModule,
  [cachingModule.slug]: cachingModule,
  [rateLimitingModule.slug]: rateLimitingModule,
};
