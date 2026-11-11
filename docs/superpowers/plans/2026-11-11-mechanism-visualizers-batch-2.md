# Mechanism visualizers batch 2 — integration plan

**Status:** T4 complete (`inside-a-cache-stampede`, `inside-celery-prefetch`) — batch-2 mechanism visualizers shipped.
**Scope:** Eight HTML drafts under `content/Visualizer/` → eight `kind: "mechanism"` modules. HTML remains author reference; runtime is TypeScript only.

**Last updated:** 2026-11-11 — locked decisions + senior review rounds 1–3 incorporated.

**Reference docs (read before any implementation thread):**

- `wiki-fe/CLAUDE.md` → `CONVENTIONS.md`
- `wiki-fe/docs/_meta/visualizer/README.md`
- Shipped patterns: `lib/visualizer/http-request-path/`, `lib/visualizer/postgres-mvcc/`, `lib/visualizer/mechanism/links.ts`

**Do not re-port:** the eight existing mechanism visualizers (GIL through HTTP request).

---

## Locked decisions

| Decision | Choice |
| --- | --- |
| Plan artifact | This file |
| Scenario tabs | **Tab count matches HTML scenario count** (stampede **3**; all others **4**). E2e and manifest drive expected count per slug — not a global “always 4”. |
| Read article, no wiki home | `articleHref: ""` → hide **Read article** (`MechanismApp` already does). Real deep links where content exists (DNS, stampede, LB, message queues). Empty: `podLimits`, `kubectl`, `k8sSvc`. |
| HTML drafts | Keep under `content/Visualizer/`; never ship as runtime |
| Mechanism UI | `MechanismApp` only; scenario chips only; `{ key: "scenario", restartOnSwitch: true }` |
| K8s Service Read article | `""` at ship |
| Content backlog (k8s topics) | Visualizers first; articles later |
| Glossary | **One string per slug** at ship; agent proposes per thread, user approves |
| Registry icons | Agent picks; themed by batch (k8s / networking / cache) |
| See also timing | **No `/visualizer/` links to slugs that are not registered yet.** T1: kubectl ↔ k8sSvc only. T3a: dns ↔ connCost only. T3b: connPool + full networking backlinks (`http`, etc.) + **k8sSvc → dns**. |
| `connCost` Read article | `load-balancer.md` `#connection-pooling--keep-alive-management` (chip-level; SNAT / silent-failure anchors in table below for teaching, not separate Read article) |
| Shape policy | **Amend CONVENTIONS + CLAUDE file map** for **mechanism presentation shapes**: new `ShapeModel` kinds live in `lib/visualizer/core/shapes.ts` + `components/visualizer/shapes/` (precedent: `mvcc`, `wal`, `btree`, `http-pipeline`). Adapters own domain copy. Still forbidden: domain words in frame, hooks, compare visualizers, and generic structural shapes. |
| Step body HTML → Rich | **No new `Rich` tones for batch-2.** `mechanism/richFromHtml`: `<code>` and `<b>` → `keyText`; `<em>` → plain string (strip tag). Not a “bold bug” — UI has no bold emphasis part. |
| Shape composite rule | **`CompositeModel.parts` is `LeafModel[]` only** — `ScheduleModel` is not a leaf. Bespoke kinds draw integrated timelines, or use top-level `schedule` for the whole stage. |
| Pod limits CPU (T2) | **Always `resource-gauges` with embedded CFS time rows** — no `kind: "schedule"` in that module (Phase 0.5 not required for T2). |
| Mixed schedule / `steps.test` | Phase **0.7** defines `skippedEvents` across non-schedule frames and axis/`fix` replays; pool T3b spikes schedule before committing (see threading). |
| Thread verification | **One** full `pnpm test` + `pnpm test:content` (if hrefs touched) + `pnpm build:e2e && pnpm test:e2e` at **end of each thread** — not repeated in per-viz checklist |

---

## Phase 0 — before T1 (blocking)

Complete before porting batch-2 HTML. Can land in one change set.

| # | Task | Why |
| --- | --- | --- |
| 0.1 | **`lib/visualizer/mechanism/rich.ts`** — dedupe parsers: `<code>`/`<b>` → `keyText`, `<em>` plain; optionally migrate existing eight modules. | One helper; matches existing emphasis semantics. |
| 0.2 | **`manifest.json`** — per **route slug** (`inside-dns-caching`, …): `scenarioCount`, `expectReadArticle`. Vitest + pytest read this file. **Phase 0 seeds all eight existing mechanism slugs**; batch-2 rows added when each new slug registers (table below is target end state). | Cross-runtime source of truth. |
| 0.2b | **`manifest.test.ts` (both ways):** (1) every `VISUALIZERS` entry with `kind: mechanism` has a manifest row; no manifest row for an unregistered slug. (2) `scenarioCount` === module scenario chips; `expectReadArticle` === non-empty `mechanismArticleHref` for the links **key** mapped from slug via `MECHANISM_VISUALIZER` paths. | Prevents e2e 404s and drift. |
| 0.3 | **`links.test.ts`** — manifest-aware href rules; **`RELATED` every `/visualizer/<slug>/` href** matches `VISUALIZERS[].slug` (module actually registered). | Catches staged-link mistakes. |
| 0.4 | **`test_visualizer_mechanism.py`** — load slugs from `manifest.json`; **`pytest.mark.parametrize`** on `test_mechanism_pages_load_stage_and_tabs` (one test per slug, own 60s budget, parallel under `-n 2`, failure names slug). Tab count + Read article from manifest fields. | Today’s single loop shares one `--timeout=60` across all pages — will flake at 16 slugs. |
| 0.5 | **Legend / `swatchesIn`** — for **mixed** schedule + non-schedule frames within a module, stop hiding non-schedule legend swatches; **keep** existing filter for all-schedule modules (hide swatches not drawn this step). | Required before **T3b** only. |
| 0.6 | **CONVENTIONS.md + CLAUDE.md** — mechanism presentation shapes (`core/shapes.ts` + shape components); **README** table when added. | Resolves CONVENTIONS vs plan. |
| 0.7 | **`skippedEvents`** — specify behaviour for non-schedule frames (skip without treating as t=0 reset), multi-`track` / `fix` axis replays; add regression fixture mirroring pool `server-closes` (lanes → fleet → lanes → fix). | Avoid false `steps.test` failures in T3b. |
| 0.8 | **`artifacts.test.ts`** — assert anchors for **all existing eight** mechanism `ARTICLE_HREF` values (in addition to compare visualizers). | Closes README gap; cheap in Phase 0. |

---

## Implementation threading

**Why threads:** limit review size and shape coupling. **T3 split** after review (~1.4k lines HTML in one old “T3”).

| Thread | Deliverables |
| --- | --- |
| **T1 — K8s hub** | `k8s-hub` (+ spike shared card/arrow primitives with `k8s-service` if worth it) → `inside-kubectl-apply` → `inside-a-kubernetes-service`. RELATED: **kubectl ↔ k8sSvc only** (no dns until T3b). Glossary ×2. Manifest + e2e slugs. |
| **T2 — Pod limits** | `resource-gauges` only (CPU CFS embedded) → `inside-pod-resource-limits`. |
| **T3a — DNS + cost** | `dns-caching` + cost (Lanes spike → `conn-ladder`). **RELATED:** dns ↔ connCost only. **artifacts.test** for dns + connCost hrefs. |
| **T3b — Connection pool** | **Spike** `ScheduleModel` for lane idle-timers; then three views: lanes, fleet, pool. Wire connPool See also + **dns/connCost → connPool**; **http** backlinks; **k8sSvc → dns**. Pool schedule must satisfy Phase 0.7 + `steps.test` (per-scenario kind strategy from spike). |
| **T4 — Cache + queue** | Stampede (**3 tabs**) — timeline/histogram. **Spike:** Lanes vs `celery-board` for Celery. Celery Read article → `message-queues.md` `#consumer-side-lag-mitigation` (or `#push-vs-pull-consumer-models` — pick at port). artifacts.test for stampede + celery hrefs. Optional **redis ↔ stampede** backlink. |

**Order:** Phase 0 → T1 → T2 → T3a → T3b → T4 (coordinate `links.ts` if T3a/T4 overlap).

**Out of scope:** article “▶ Visualize” links; deleting HTML; compare-mode upgrades.

---

## Architecture pattern (all eight)

1. `types.ts` — frame types from HTML `SC` semantics.
2. `scenarios.ts` — port `SC[]` from HTML; **step-gap audit**: README rule — every timer/expiry/state change gets its own step; **fix draft gaps** (e.g. DNS happy 200 s→300 s expiry split). **`fix` frames** stay as steps; usually `outcome: "good"` after prior `bad` steps (not collapsed into About). `clock:'fix'` may sit off-axis in copy.
3. `model.ts` — `frameModel(frame): ShapeModel`.
4. `module.ts` — kicker, footnote, **legend** — **every** module with `legend` needs new **`ScheduleSwatch` union members + CSS** (see HTTP `http-*` with non-schedule shape).
5. `registry.ts` + `modules.ts`.
6. `mechanism/links.ts` — extend `MECHANISM_VISUALIZER` keys (`MechanismSlug` = `keyof` that object; **no manual type in info.ts**).
7. **`modelKeys()`** in `shapes.ts` + **`Shape.tsx` dispatch** for each new kind.
8. `module.test.ts` — **pinned per-scenario frame counts** (like GIL/MVCC), bad `outcome` where HTML has `bad: true`.

**`steps.test.ts`:** schedule frames only — pool (and any module with `kind: "schedule"`) must not skip events between steps. Frame-swap modules still need **manual step-gap audit** (not covered automatically).

---

## Shape inventory (revised)

| Kind | New? | Used by | Notes |
| --- | --- | --- | --- |
| `dns-caching` | Yes | DNS | Integrated chain + timeline (HTML one SVG mental model). |
| `conn-ladder` | Maybe | Cost | After Lanes spike in T3a; port grid in same kind or sibling view. |
| `schedule` | Reuse | Pool **lanes** | Not inside composite. |
| `connection-pool` (bespoke) or views | Maybe | Pool **fleet**, **pool** | Three renderers in HTML. |
| `timeline` / `histogram` | Extend/reuse | Stampede | 3 scenarios only. |
| `celery-board` or `lanes` | Spike T4 | Celery | |
| `resource-gauges` | Yes | Pod limits | |
| `k8s-hub` | Yes | kubectl | |
| `k8s-service` | Yes | K8s Service | May share subcomponents with hub after spike. |

**Not allowed:** `composite` containing `schedule`.

---

## Mechanism manifest (target end state)

When a slug first registers, add its row to `manifest.json` (do not pre-fill all eight before T1). Existing eight mechanisms are in manifest after Phase 0 extends it.

| Slug | Scenarios | Tabs | Read article at ship |
| --- | --- | --- | --- |
| `inside-dns-caching` | 4 | 4 | yes |
| `cost-of-a-new-connection` | 4 | 4 | yes |
| `inside-a-connection-pool` | 4 | 4 | yes |
| `inside-a-cache-stampede` | 3 | **3** | yes |
| `inside-celery-prefetch` | 4 | 4 | yes |
| `inside-pod-resource-limits` | 4 | 4 | no |
| `inside-a-kubernetes-service` | 4 | 4 | no |
| `inside-kubectl-apply` | 4 | 4 | no |

Existing eight slugs remain in manifest for e2e (all 4 tabs, all Read article today).

---

## Article anchors (verified / intended)

| Key | Read article (primary) | Also useful (See also / teaching) |
| --- | --- | --- |
| dns | `dns.md#ttl-and-propagation-failures` | — |
| stampede | `caching.md#cache-stampede--thundering-herd` | — |
| connCost | `load-balancer.md#connection-pooling--keep-alive-management` | `#snat-port-exhaustion--connection-tracking-limits` (time-wait scenario) |
| connPool | `load-balancer.md#connection-pooling--keep-alive-management` | `#diagnosing-silent-connection-failures` (lb-forgets) |
| celery | `message-queues.md#consumer-side-lag-mitigation` | `#push-vs-pull-consumer-models` |
| podLimits, kubectl, k8sSvc | `""` | — |

**artifacts.test.ts:** Phase 0 covers eight existing mechanism hrefs; each thread adds asserts for **new** non-empty hrefs it introduces.

---

## Registry and landing page

For each new entry in `VISUALIZERS`:

- `kind: "mechanism"`
- **`title` must exactly equal** `module.title` (`registry.test.ts` asserts this)
- `description` — one sentence from HTML lede (interview-prep tone)
- `icon` — emoji; themed by batch thread

Append after existing eight (networking block, cache/celery, k8s) or backlog order — cosmetic.

---

## Per-visualizer specification

### 1. Inside DNS Caching — T3a

| Field | Value |
| --- | --- |
| Slug | `inside-dns-caching` |
| Key | `dns` |
| Scenarios | `happy`, `old-ip`, `ttl-too-late`, `negative` |
| Shape | `dns-caching` |
| Glossary | one term at ship (e.g. `dns ttl`) |
| See also (T3a) | connCost only — add connPool in **T3b** |

### 2. The Cost of a New Connection — T3a

| Field | Value |
| --- | --- |
| Slug | `cost-of-a-new-connection` |
| Key | `connCost` |
| Scenarios | `happy`, `round-trips`, `time-wait`, `resumption` |
| Shape | Lanes spike → `conn-ladder` |
| See also (T3a) | dns only — connPool + http in **T3b** |

### 3. Inside a Connection Pool — T3b

| Field | Value |
| --- | --- |
| Slug | `inside-a-connection-pool` |
| Key | `connPool` |
| Scenarios | `happy`, `lb-forgets`, `server-closes`, `pool-exhausted` |
| Views | **lanes**, **fleet**, **pool** (per HTML); **schedule spike** before implementation |
| See also (T3b) | connCost, dns, http; update dns/connCost RELATED to include connPool |

### 4. Inside a Cache Stampede — T4

| Field | Value |
| --- | --- |
| Slug | `inside-a-cache-stampede` |
| Key | `stampede` |
| Scenarios | `happy`, `hot-key`, `sync-expiry` (**3 tabs**) |
| See also | redis (optional backlink in T4) |

### 5. Inside Celery Prefetch — T4

| Field | Value |
| --- | --- |
| Slug | `inside-celery-prefetch` |
| Key | `celery` |
| Scenarios | `happy`, `prefetch`, `acks`, `visibility` |
| Shape | Lanes spike → `celery-board` |

### 6. Inside Pod Resource Limits — T2

| Field | Value |
| --- | --- |
| Slug | `inside-pod-resource-limits` |
| Key | `podLimits` |
| Scenarios | `happy`, `oom`, `cpu`, `evict` |

### 7. Inside a Kubernetes Service — T1

| Field | Value |
| --- | --- |
| Slug | `inside-a-kubernetes-service` |
| Key | `k8sSvc` |
| Scenarios | `happy`, `ready`, `shutdown`, `grpc` |
| See also at T1 | kubectl only. **Add dns in T3b.** |

### 8. Inside kubectl apply — T1

| Field | Value |
| --- | --- |
| Slug | `inside-kubectl-apply` |
| Key | `kubectl` |
| Scenarios | `happy`, `pending`, `heal`, `rollout` |
| See also | k8sSvc |

---

## Cross-link graph (See also)

```text
dns ──► connCost ──► connPool ◄──► http
stampede ──► redis   (optional ◄── in T4)
k8sSvc ◄──► kubectl
k8sSvc ──► dns        (wire in T3b only)
```

---

## Testing matrix

| Layer | What |
| --- | --- |
| Phase 0 | JSON manifest + manifest.test, links.test (RELATED slugs), e2e, legend, rich, skippedEvents, artifacts (8 mechanisms), CONVENTIONS amend |
| `module.test.ts` | Pinned frame counts per scenario; bad steps |
| `links.test.ts` | Glossary + manifest-aware hrefs + RELATED visualizer hrefs |
| `registry.test.ts` | New entries per thread |
| `steps.test.ts` | Schedule modules only |
| `artifacts.test.ts` | Eight existing mechanism hrefs (Phase 0); new hrefs per thread |
| E2e | Manifest-driven tabs + Read article |

---

## Checklist — per visualizer (within a thread)

- [ ] `types.ts`, `scenarios.ts` (+ **step-gap audit** vs HTML)
- [ ] `model.ts` + `module.ts` (uses `mechanism/rich.ts`)
- [ ] Shape: `shapes.ts` types, `modelKeys`, component, CSS, `Shape.tsx`
- [ ] Legend: new `ScheduleSwatch` members + CSS whenever `mod.legend` is set
- [ ] `module.test.ts` with **pinned counts**
- [ ] `registry.ts`, `modules.ts`, `links.ts`, glossary (one term)
- [ ] `manifest.json` entry + e2e row (when slug first ships)

**End of thread:** one full test run (see locked decisions).

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| T3b scope (fleet + schedule) | Own thread; schedule spike + Phase 0.7 before port. |
| Dead See also links | `links.test` RELATED resolver (Phase 0.3); staged RELATED per thread table above. |
| `links.ts` overlap | Coordinate T3a/T4 edits. |

---

## Corrections vs early draft

| Item | Value |
| --- | --- |
| Connection pool scenario 3 | `pool-exhausted` |
| kubectl scenario 2 | `heal` |
| Celery scenario 4 | `visibility` |
| Cache stampede | **3** scenarios / tabs |
| Pool HTML | **lanes + fleet + pool** views |

---

## Review log (2026-11-11)

**Round 1:** Phase 0, T3a/T3b split, stampede 3 tabs, composite ban, manifest concept, anchors, spikes.

**Round 2:** JSON manifest + drift test; staged See also; RELATED href unit test; `skippedEvents` Phase 0.7; CONVENTIONS amendment for mechanism shapes; artifacts for eight existing hrefs; pool schedule spike; T2 CPU in gauges only; drop `load-balancer-tls` from connCost anchor table.

**Round 3:** `richFromHtml` semantics (no bold tone); legend swatch rule always; 0.5 T3b-only + narrow mixed-module fix; RELATED vs `VISUALIZERS`; manifest bidirectional + per-ship rows; shapes live in `core/shapes.ts`; restore registry title rule + `fix` frame outcomes.

**Round 4:** e2e parametrize per manifest slug; Phase 0 explicitly seeds eight manifest rows.

---

*End of plan.*
