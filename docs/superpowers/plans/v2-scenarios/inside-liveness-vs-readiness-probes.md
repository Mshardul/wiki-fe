# Liveness vs Readiness Probes (`inside-liveness-vs-readiness-probes`)

**Status:** draft

## Objective

Separate **liveness** (kubelet **restart**) from **readiness** (endpoint **traffic**). **startupProbe** blocks liveness/readiness until slow boot finishes. **Deep readiness** (DB in the probe) can empty the Service. Probe semantics only — full ClusterIP / kube-proxy routing stays on `inside-a-kubernetes-service`.

## Prereqs

- `inside-kubectl-apply`, `inside-a-kubernetes-service`, `inside-pod-resource-limits`.

## Tracing device

**Whiteboard at the aha step (liveness chip):** one **pod** with **liveness**, **readiness**, and **Endpoints ready** bit. Traffic follows **ready**; kubelet **restart** follows **liveness**. At the aha step, **traffic may still flow** (readiness passing) while **liveness** fails on a wedged process.

**Why:** students conflate “unhealthy for traffic” with “should restart.”

**Implementer note:** **new** — `k8s-probe-panel` (liveness / readiness / Endpoints-ready booleans + traffic allowed glyph).

## Scenarios

### happy — Ready serves, not ready drains

Question: Readiness fails later — what changes for traffic vs kubelet?

Misconception: Failed readiness always restarts the pod.

Interview question: Contrast with liveness failure.

Aha: step 3

Steps:

1. **ready=true**; Endpoints list pod IP; request **200**.
2. Readiness probe **fails** (`/ready` → 503).
3. Pod dropped from Endpoints; traffic **stops** — **aha:** no kubelet restart.
4. Readiness **passes**; Endpoints add pod again.

### liveness — Restart on wedged process

Question: App wedged but `/ready` still 200 — which probe fires and what happens to traffic?

Misconception: Readiness failure is enough to heal a deadlock.

Interview question: Why keep liveness **cheap and local**?

Aha: step 4

Steps:

1. Internal **stuck** flag set; worker cannot make progress.
2. **Readiness** still **200**; traffic still routed.
3. **Liveness** fails on stuck check.
4. Kubelet **restarts** container — **aha:** restart is liveness; traffic was still arriving until step 3–4.
5. New container; **ready=false** until readiness passes.

### startup — Boot loop without startupProbe

Question: JVM needs 90 s; liveness fails at 10 s — why restart loops before traffic?

Misconception: Readiness alone protects slow boot.

Interview question: What does `startupProbe` defer?

Aha: step 3

Steps:

1. Container **starts**; liveness period **10 s** active (no startup probe).
2. At 10 s **liveness fails**; kubelet **kills**; **restartCount 1**.
3. Second boot killed again at 10 s; **restartCount 2** — **aha:** never reaches readiness.
4. Enable **startupProbe** (long window); liveness/readiness **suppressed** until startup succeeds.
5. Startup **passes** at 90 s; readiness **passes**; Endpoints add pod.

### deep — DB in readiness

Question: Readiness queries Postgres; DB blips — what does the Service see?

Misconception: Deep checks are always safer.

Interview question: load-balancer.md shallow vs deep health.

Aha: step 3

Steps:

1. Three pods; readiness includes **DB ping**.
2. DB **unavailable**; all readiness **fail** together.
3. Endpoints **empty** — **aha:** total drain; processes still running.

## Read article

`/system-design/components/load-balancer/#health-check-depth-shallow-vs-deep`

## Notes

- **liveness** chip: `/ready` can stay 200 while workers are wedged only if **liveness** checks something the request path can block on (e.g. watchdog on a separate thread). Stage uses an explicit **stuck** flag — not “HTTP still returns 200” without that caveat.
- Shallow readiness + passive LB observation: **About** only (no extra chip).
- Do not duplicate k8sSvc **ready** rollout chip or **grpc** stickiness — See also only.
- No Service traffic diagram on this page beyond a single **request allowed / blocked** glyph tied to Endpoints.

## Approval

- [x] Reviewer pass
- [ ] Shardul
