import { asyncioModule } from "./asyncio/module";
import { cachingModule } from "./caching/module";
import type { VisualizerModule } from "./core/types";
import { evictionModule } from "./eviction/module";
import { gilModule } from "./gil/module";
import { goSchedulerModule } from "./go-scheduler/module";
import { httpRequestPathModule } from "./http-request-path/module";
import { postgresBtreeModule } from "./postgres-btree/module";
import { postgresMvccModule } from "./postgres-mvcc/module";
import { postgresWalModule } from "./postgres-wal/module";
import { rateLimitingModule } from "./rate-limiting/module";
import { redisSingleThreadModule } from "./redis-single-thread/module";

export const MODULES: Record<string, VisualizerModule> = {
  [evictionModule.slug]: evictionModule,
  [cachingModule.slug]: cachingModule,
  [rateLimitingModule.slug]: rateLimitingModule,
  [gilModule.slug]: gilModule,
  [asyncioModule.slug]: asyncioModule,
  [redisSingleThreadModule.slug]: redisSingleThreadModule,
  [goSchedulerModule.slug]: goSchedulerModule,
  [postgresMvccModule.slug]: postgresMvccModule,
  [postgresBtreeModule.slug]: postgresBtreeModule,
  [postgresWalModule.slug]: postgresWalModule,
  [httpRequestPathModule.slug]: httpRequestPathModule,
};
