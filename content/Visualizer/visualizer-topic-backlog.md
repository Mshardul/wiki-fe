# Visualizer Topic Backlog

Nov 7, 2026 · @Shardul

v1 list of 17 zoom-in visualizers for engineers with 5+ years. Each topic follows the template: a happy path plus 2–3 scenarios that diverge from it. Mechanisms are verified by senior devs.

## Request path & networking

### 1. HTTP request path

**Happy path:** request flows LB → nginx → gunicorn worker → middleware chain → handler, and the response unwinds the same chain.

1. Auth middleware returns 401. Which middleware never runs, and which still runs on the way out?
2. The upstream is slow. Why a 504 in one setup and a 502 in another, and which timeout fires first?
3. A 50 MB upload. Where is the body buffered, and where is it rejected (413) before the app sees it?

### 2. Connection pooling vs LB idle timeouts

**Happy path:** the client reuses a keep-alive connection from its pool for each request.

1. The LB's idle timeout is shorter than the pool's. Why does the next request fail with "connection reset"?
2. The app server's keep-alive timeout is shorter than the LB's. Why do random 502s appear under light traffic?
3. The pool is exhausted. Why does latency climb while server CPU sits idle?

### 3. The cost of a new connection

**Happy path:** DNS lookup, TCP handshake (1 round trip), TLS 1.3 handshake (1 round trip), then the first request; later requests reuse the same connection.

1. Why is the first request so much slower than the rest? Count the round trips before a single byte of the request is sent.
2. Many short connections to one destination. Why does the client run out of ephemeral ports? The closing side holds each one in TIME\_WAIT for 2×MSL, so a delayed segment from an old connection can't land in a new one. Keep-alive makes the problem disappear.
3. Session resumption and 0-RTT. What does a reconnect skip, and why is 0-RTT data replayable?

### 4. DNS caching

**Happy path:** stub resolver → recursive resolver → authoritative server, each answer cached for its TTL.

1. The record changed hours ago. Why is traffic still going to the old IP? Caches in the OS, the language runtime, and pooled connections that never re-resolve.
2. TTL was lowered right before a migration. Why didn't it help?
3. A lookup failed once. Why does the NXDOMAIN keep coming back after the record is created (negative caching)?

## Runtimes & concurrency

### 5. Python GIL

Done. Content doc and visualizer built.

### 6. asyncio event loop

Done. Visualizer built at `/visualizer/asyncio-event-loop/`.

**Happy path:** one thread; the loop waits for ready sockets, runs each coroutine until its next `await`, then moves on.

1. One `time.sleep()` or `requests.get()` inside an `async def`. Why does every request freeze?
2. A CPU-heavy coroutine never awaits. Why do the others starve, with no preemption to save them?
3. FastAPI: why is a blocking call fine in a plain `def` endpoint but fatal in an `async def` one? (`def` runs in a threadpool.)

### 7. Go scheduler (G-M-P)

**Happy path:** goroutines wait in a P's run queue; an OS thread (M) attached to that P runs them; idle Ps steal work.

1. A goroutine makes a blocking syscall. The M detaches, and the P is handed to another M. How does the program keep running?
2. Network I/O: why does no thread block at all? The netpoller parks the goroutine.
3. A tight loop with no function calls. Why could it hog a P before Go 1.14, and how does async preemption fix that?

## Data stores

### 8. Postgres MVCC & vacuum

**Happy path:** UPDATE writes a new row version and marks the old one dead; vacuum reclaims it once no snapshot can still see it.

1. One long-running or idle-in-transaction session. Why do tables it never touched bloat?
2. Why does an UPDATE that doesn't touch indexed columns skip index writes (HOT update)?
3. Transaction ID wraparound. Why does Postgres eventually force an aggressive vacuum, and what is freezing?

### 9. B-tree indexes

**Happy path:** an index on (a, b) is sorted by a, then b; `WHERE a = ?` descends the tree straight to the matching range.

1. Why doesn't it help `WHERE b = ?` the same way? Leftmost prefix (pin the version: Postgres 18 added skip scan).
2. Why does `WHERE lower(email) = ?` ignore an index on `email`?
3. Why can some queries skip the table entirely (index-only scan), and why does that depend on vacuum?

### 10. WAL & fsync

**Happy path:** COMMIT writes a WAL record, fsyncs it, then acknowledges; data pages are written later at checkpoints.

1. With `synchronous_commit = off`, what can be lost in a crash, and why is nothing corrupted?
2. After a crash, how does replaying WAL from the last checkpoint rebuild the data?
3. The primary says committed, but a read on the replica doesn't see the row. What did "committed" actually promise?

### 11. Redis single thread

**Happy path:** one event loop runs commands one at a time for many clients, each in microseconds.

1. One `KEYS *` or a huge `DEL`. Why does every client stall? (`SCAN`, `UNLINK`.)
2. Redis 6 added I/O threads. Why is command execution still single-threaded?
3. A background save forks the process. Why can latency and memory spike under heavy writes (copy-on-write)?

### 12. Kafka consumer rebalance

**Happy path:** a group's consumers each own some partitions, process records, and commit offsets.

1. Adding one consumer. Why does the whole group pause under the eager protocol, and what does cooperative rebalancing change?
2. Processing takes longer than `max.poll.interval.ms`. Why does the consumer get kicked out and loop through rebalances?
3. More consumers than partitions. Why do some sit idle?

## Infra & distributed

### 13. kubectl apply → running pod

**Happy path:** API server validates and stores in etcd → Deployment controller creates a ReplicaSet → ReplicaSet controller creates a Pod → scheduler binds it to a node → kubelet starts the containers.

1. The pod stays Pending forever. Why does nothing error? The scheduler keeps looping with no node that fits.
2. You delete a pod and it comes back. Which controller noticed, and why is everything a reconcile loop?
3. Rolling update. How do `maxSurge` and `maxUnavailable` shape the swap?

### 14. Kubernetes Services

**Happy path:** a ClusterIP is a virtual address; kube-proxy programs rules on every node that rewrite it to a ready pod's IP from the EndpointSlices.

1. A pod fails its readiness probe. How does it drop out of traffic without anything being restarted?
2. During a rollout, why does a terminating pod still get requests for a moment? (Endpoint removal races SIGTERM; the preStop sleep fix.)
3. gRPC or other long-lived connections. Why does traffic stay stuck on old pods when you scale up? (Balancing happens per connection.)

### 15. Pod resource limits

**Happy path:** requests decide where a pod is scheduled; limits are enforced by cgroups on the node.

1. OOMKilled while the node has free memory. Why does the cgroup limit win?
2. CPU throttling at 40% average usage. How does the CFS quota period cause latency spikes?
3. Node-pressure eviction vs OOMKill. Two different mechanisms; which one hit you?

### 16. Celery prefetch & acks

**Happy path:** the producer publishes to the broker; a worker prefetches tasks, runs them, and acks.

1. One slow task. Why do fast tasks already prefetched by that worker wait behind it? (Prefetch multiplier.)
2. `acks_late` and a worker crash. Why does the task run twice, and why must it be idempotent?
3. Redis broker visibility timeout. Why does a long or delayed task get redelivered to a second worker?

### 17. Cache stampede

**Happy path:** cache-aside: read the cache; on a miss, load from the database and fill the cache.

1. A hot key expires. Why do thousands of concurrent misses all hit the database at once?
2. Fixes compared: lock / single-flight, early probabilistic refresh, stale-while-revalidate.
3. Many keys written at the same moment with the same TTL. Why do they all expire together, and how does jitter help?

## Merge or drop candidates

Writing out the scenarios led to one merge, two renames and one note.

- **Merged:** TCP TIME\_WAIT and TLS handshake & resumption became **The cost of a new connection** (3). TLS alone had only two scenarios, and both topics answer the same question: what does opening a connection cost, and why does reuse matter?
- **Renamed:** "Composite B-tree index" became **B-tree indexes** (9), and "Pod OOMKilled" became **Pod resource limits** (15). Both broadened to reach three scenarios without losing the original hook.
- **Cache stampede (17), scenario 2** compares fixes rather than diverging from the happy path. It works better as the interview-angle section than as a scenario.

v1 has 17 topics.
