import { asyncioModule } from "./asyncio/module";
import { cacheStampedeModule } from "./cache-stampede/module";
import { cachingModule } from "./caching/module";
import { celeryPrefetchModule } from "./celery-prefetch/module";
import { connectionCostModule } from "./connection-cost/module";
import { connectionPoolModule } from "./connection-pool/module";
import type { VisualizerModule } from "./core/types";
import { dnsCachingModule } from "./dns-caching/module";
import { evictionModule } from "./eviction/module";
import { gilModule } from "./gil/module";
import { goSchedulerModule } from "./go-scheduler/module";
import { httpRequestPathModule } from "./http-request-path/module";
import { kubectlApplyModule } from "./kubectl-apply/module";
import { kubernetesServiceModule } from "./kubernetes-service/module";
import { podResourceLimitsModule } from "./pod-resource-limits/module";
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
  [kubectlApplyModule.slug]: kubectlApplyModule,
  [kubernetesServiceModule.slug]: kubernetesServiceModule,
  [podResourceLimitsModule.slug]: podResourceLimitsModule,
  [dnsCachingModule.slug]: dnsCachingModule,
  [connectionCostModule.slug]: connectionCostModule,
  [connectionPoolModule.slug]: connectionPoolModule,
  [cacheStampedeModule.slug]: cacheStampedeModule,
  [celeryPrefetchModule.slug]: celeryPrefetchModule,
};
