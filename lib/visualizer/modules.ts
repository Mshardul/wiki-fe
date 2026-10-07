import type { VisualizerModule } from "./core/types";
import { evictionModule } from "./eviction/module";

export const MODULES: Record<string, VisualizerModule> = {
  [evictionModule.slug]: evictionModule,
};
