# Content backlog

Active content work across `content/**`. Schema and rules: [`docs/_meta/ai-instructions/content-backlog.md`](./_meta/ai-instructions/content-backlog.md).

These are **not** app tickets. Do not use `WIKI-xxx` IDs here.

Done / Dropped history: [`content-archive.md`](./content-archive.md).

| ID | Entry Date | Summary (upto 7 words) | Kind | Path | Description (upto 30 words) | Status | Done Date | Source | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DSA-024 | 2026-08-14 | Backfill changelog from git history | hygiene | CHANGELOG.md | Reconstruct missing major CHANGELOG entries from git history per file; skip tiny copy-only edits. | Backlog | - | reading-UX 2026-08-14 | p3 |
| SD-003 | 2026-08-15 | New article: Capacity Estimation | new-article | system-design/algorithms/capacity-estimation.md | Baseline interview skill referenced informally in 4+ component pages (load-balancer, caching, message-queues, observability) but no standalone QPS/storage/bandwidth reference exists. | Backlog | - | gap-scan 2026-08-15 | p2 |
| DSA-028 | 2026-08-15 | Fix stale pending-articles note | hygiene | dsa/patterns/pattern-selection-cheatsheet.md | "4 remaining" note names Cyclic Sort, Subsets & Permutations, Top-K Elements, DP Patterns as pending; all 4 already exist as filled articles. | Backlog | - | gap-scan 2026-08-15 | p3 |
| SD-004 | 2026-08-15 | Observability missing from index table | hygiene | system-design/index.md | Article exists at components/observability.md but is not linked in the Components table. | Backlog | - | gap-scan 2026-08-15 | p3 |
| SD-005 | 2026-08-15 | New article: Vector Clocks | new-article | system-design/algorithms/vector-clocks.md | Causality-tracking algorithm behind Dynamo-style conflict resolution; no coverage in Algorithms & Concepts. | Backlog | - | gap-scan 2026-08-15 | p2 |
| SD-006 | 2026-08-15 | New article: Write-Ahead Log | new-article | system-design/algorithms/write-ahead-log.md | Durability primitive underlying DBs, LSM-trees, Kafka; referenced implicitly across HLDs but no standalone page. | Backlog | - | gap-scan 2026-08-15 | p2 |
| SD-007 | 2026-08-15 | New article: Distributed Task Scheduler | new-article | system-design/hld/distributed-task-scheduler.md | Common HLD interview ask (cron-at-scale, Airflow-style); missing from HLD list. | Backlog | - | gap-scan 2026-08-15 | p2 |
| SD-008 | 2026-08-15 | New article: Inventory / E-commerce System | new-article | system-design/hld/inventory-ecommerce-system.md | Classic HLD (oversell prevention, inventory locking, order flow); missing from HLD list. | Backlog | - | gap-scan 2026-08-15 | p2 |
| SD-009 | 2026-08-15 | New article: Leader Election | new-article | system-design/algorithms/leader-election.md | Named inside Consensus (Raft/Paxos) but no standalone mechanics page (bully algorithm, ring algorithm). | Backlog | - | gap-scan 2026-08-15 | p2 |
| SD-011 | 2026-08-15 | Fill empty stub: Bloom Filter | fill-stub | system-design/algorithms/bloom-filter.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-024 | 2026-08-15 | Fill empty stub: Proxies | fill-stub | system-design/components/proxies.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-026 | 2026-08-15 | Fill empty stub: Service Discovery | fill-stub | system-design/components/service-discovery.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-027 | 2026-08-15 | Fill empty stub: WebSockets / SSE / Long Polling | fill-stub | system-design/components/websockets-sse-long-polling.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-030 | 2026-08-15 | Fill empty stub: Google Drive / File Storage | fill-stub | system-design/hld/google-drive-file-storage.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-032 | 2026-08-15 | Fill empty stub: Notification System | fill-stub | system-design/hld/notification-system.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-033 | 2026-08-15 | Fill empty stub: Payment System | fill-stub | system-design/hld/payment-system.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-034 | 2026-08-15 | Fill empty stub: Search Autocomplete | fill-stub | system-design/hld/search-autocomplete.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-035 | 2026-08-15 | Fill empty stub: Ticketmaster / Booking | fill-stub | system-design/hld/ticketmaster-booking.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-036 | 2026-08-15 | Fill empty stub: Twitter / News Feed | fill-stub | system-design/hld/twitter-news-feed.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-037 | 2026-08-15 | Fill empty stub: Uber / Ride Sharing | fill-stub | system-design/hld/uber-ride-sharing.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-039 | 2026-08-15 | Fill empty stub: Web Crawler | fill-stub | system-design/hld/web-crawler.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-040 | 2026-08-15 | Fill empty stub: WhatsApp / Chat System | fill-stub | system-design/hld/whatsapp-chat-system.md | Title-only stub, indexed but unfilled. | Backlog | - | gap-scan 2026-08-15 | p1 |
| SD-043 | 2026-08-15 | Fill partial stub: Tracing | fill-stub | system-design/components/tracing.md | Prerequisites/TOC/TLDR marked TODO/Stub; sections not completed. | Backlog | - | gap-scan 2026-08-15 | p1 |
