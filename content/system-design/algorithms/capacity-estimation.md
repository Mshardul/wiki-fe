# Capacity Estimation

## Prerequisites

**[Load Balancing](../components/load-balancer.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Mental Model & Intuition](#mental-model--intuition)
- [Formal Definition](#formal-definition)
- [The Estimation Framework](#the-estimation-framework)
- [Reference Numbers to Memorize](#reference-numbers-to-memorize)
- [Worked Example: End-to-End](#worked-example-end-to-end)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

Capacity estimation converts stated assumptions (DAU, read/write ratio, payload size) into QPS, storage, and bandwidth figures that expose the system's dominant bottleneck before any architecture is drawn. It's arithmetic, not precision engineering - correct order of magnitude beats a wrong exact number. The skill isn't the math, it's picking the *one* number that will actually constrain the design and saying so out loud. Every HLD page in this wiki performs this derivation in its own Capacity Estimation section using the framework below.

## Mental Model & Intuition

**You're sizing a bucket before deciding what pipe fills it.** The interviewer isn't grading your arithmetic - they're checking whether you reach for scale numbers before proposing an architecture, and whether you can defend "why this number matters" instead of just producing it. A candidate who says "storage isn't the bottleneck here, sustained write QPS is" after 90 seconds of napkin math is signaling seniority; a candidate who computes five numbers and never says which one binds is signaling recall without judgment.

## Formal Definition

Capacity estimation is the process of deriving order-of-magnitude system load figures - queries per second, storage volume, network bandwidth, memory footprint - from a small set of stated business assumptions (user count, usage frequency, payload size, retention period), in order to identify which resource dimension will constrain the design.

## The Estimation Framework

The derivation always runs in the same order because each step feeds the next: **DAU → QPS → Storage → Bandwidth**, ending in a stated dominant constraint. This is the exact order HLD pages in this wiki use in their Capacity Estimation sections (see, e.g., [distributed-cache.md](../hld/distributed-cache.md), [url-shortener.md](../hld/url-shortener.md)) - this article is the reference for *how* those numbers are derived; the HLD pages just state the results for their specific system.

### Step 1: DAU → Requests Per Day

Start from daily active users (DAU) and a stated actions-per-user-per-day figure (given or reasonably assumed and stated as an assumption):

```
requests/day = DAU × actions_per_user_per_day
```

If the prompt gives MAU instead of DAU, a common stickiness ratio is DAU ≈ MAU / 20 to MAU / 30 for a moderately-engaged consumer app - state the ratio you're using, don't silently pick one.

### Step 2: Requests/Day → Average QPS

```
avg_QPS = requests/day ÷ 86,400   (seconds in a day)
```

`86,400` is worth memorizing exactly - dividing by a rounded `100,000` or `80,000` introduces error into every downstream number.

### Step 3: Read/Write Split

State the read/write ratio explicitly and apply it to `avg_QPS`, since reads and writes usually hit different bottlenecks (read replicas/cache vs. write throughput on the primary):

```
read_QPS  = avg_QPS × (ratio_read / (ratio_read + ratio_write))
write_QPS = avg_QPS × (ratio_write / (ratio_read + ratio_write))
```

A 100:1 ratio (URL shortener redirects) and a 1:1 ratio (chat messages) produce wildly different architectures from the same DAU - the ratio is not a minor detail, it's a primary design input.

### Step 4: Average QPS → Peak QPS

Real traffic isn't uniform across the day - a peak multiplier converts average to worst-case sustained load, which is the number that actually sizes infrastructure:

```
peak_QPS = avg_QPS × peak_multiplier
```

**Peak multiplier reference:**

| Traffic pattern | Typical multiplier |
| --- | --- |
| Steady B2B/enterprise traffic | 2× |
| Consumer app, normal daily cycle | 2-3× |
| Consumer app with a known daily spike (lunch, evening) | 3-5× |
| Flash sale / live event / breaking news | 10-100×+ (state as a separate scenario, not the baseline) |

> ⚖️ **Decision Framework**
> A flash-sale-class spike is not "peak QPS with a bigger multiplier" - it's a different capacity regime requiring its own design conversation (queueing, load shedding, waiting rooms - see [Load Balancer overload handling](../components/load-balancer.md)). Naming it separately from steady-state peak is itself a signal of seniority; folding a 50× spike into a "generous" 5× multiplier and calling it done is the junior tell.

### Step 5: Storage-Per-Record → Total Storage

```
storage_per_record = sum of field sizes (+ index/metadata overhead, typically +10-30%)
total_storage_year_1 = new_records/day × storage_per_record × 365
total_storage_at_year_N = total_storage_year_1 × N × growth_factor
```

Always state a replication factor separately and multiply it in last (`× replication_factor`, typically 3 for a distributed store) - it's a distinct multiplier from growth, and conflating them under-communicates that redundancy, not organic growth, is often the larger term.

### Step 6: Bandwidth/Throughput from Payload Size × QPS

```
bandwidth = QPS × avg_payload_size
```

Compute this for read and write paths separately (payload sizes usually differ - a write might be a small form submission, a read might return a full profile with an embedded image URL). State the unit conversion explicitly: bytes/sec → Mbps requires `× 8 ÷ 1,000,000`; a candidate who reports "80MB/s" when they mean "80Mbps" is off by 8×, which can flip a "fits on one NIC" conclusion.

### Step 7: State the Dominant Constraint

The framework's output isn't four numbers - it's naming which one actually binds the design, and saying why the others don't. This is the step candidates most often skip, and it's the one the interviewer is actually listening for (see the [worked example](#worked-example-end-to-end) below for what this looks like stated out loud).

## Reference Numbers to Memorize

Two sets of numbers make estimation fast enough to do live: unit conversions, and latency numbers that tell you what's cheap versus expensive at scale.

### Powers of Two / Powers of Ten Approximations

| Power of 2 | Exact value | Approx. (power of 10) |
| --- | --- | --- |
| 2¹⁰ | 1,024 | ~10³ (1 thousand, KB) |
| 2²⁰ | 1,048,576 | ~10⁶ (1 million, MB) |
| 2³⁰ | ~1.07 billion | ~10⁹ (1 billion, GB) |
| 2⁴⁰ | ~1.1 trillion | ~10¹² (1 trillion, TB) |

The practical use: treat `1024 ≈ 1000` for rapid mental math (the ~2.4% error compounds slowly and doesn't change an order-of-magnitude conclusion), but say "approximately" out loud so the interviewer knows it's a deliberate simplification, not a mistake.

**Seconds in common periods** (memorize these exactly, they're used in every derivation): a day ≈ 86,400s (≈ 10⁵), a month ≈ 2.6M s, a year ≈ 31.5M s (≈ π × 10⁷ - a useful mnemonic).

### Latency Numbers Every Programmer Should Know

Order-of-magnitude latency figures for common operations, used to justify design decisions (why cache beats DB, why same-region beats cross-region):

| Operation | Approx. latency |
| --- | --- |
| L1/L2 cache reference | ~1 ns |
| Main memory (RAM) reference | ~100 ns |
| SSD random read | ~100 μs (0.1 ms) |
| Round trip within same datacenter | ~0.5 ms |
| Read 1MB sequentially from SSD | ~1 ms |
| HDD seek | ~10 ms |
| Round trip cross-country / same continent | ~50 ms |
| Round trip intercontinental | ~150 ms |

The takeaway that matters in an interview isn't the individual numbers, it's the *ratios*: memory is ~100,000× faster than a cross-country round trip, and an SSD random read is ~1,000× faster than an HDD seek. Those ratios are what justify "add a cache" or "co-locate the service with its database" as a capacity-driven decision, not a stylistic preference.

## Worked Example: End-to-End

**Scenario:** a photo-sharing app. Stated assumptions: 50M DAU, each user views 20 photos and uploads 0.1 photos (1 in 10 users uploads once) per day, average photo size 200KB (post-compression), metadata record ~500 bytes, 3-year retention target, replication factor 3.

**Step 1 - DAU → requests/day:**
Reads: `50M × 20 = 1B photo views/day`. Writes: `50M × 0.1 = 5M uploads/day`.

**Step 2 - Average QPS:**
Read: `1,000,000,000 ÷ 86,400 ≈ 11,600 QPS`. Write: `5,000,000 ÷ 86,400 ≈ 58 QPS`.

**Step 3 - Read/write ratio:** ~200:1, read-heavy - confirms this is a caching/CDN problem on the read path, not a write-throughput problem.

**Step 4 - Peak QPS (3× multiplier for a consumer app with an evening usage spike):**
Read peak: `11,600 × 3 ≈ 35,000 QPS`. Write peak: `58 × 3 ≈ 175 QPS`.

**Step 5 - Storage:**
Photo blobs: `5M uploads/day × 200KB × 365 days × 3 years ≈ 1.1 PB` before replication; `× 3` replication ≈ **3.3 PB over 3 years**. Metadata: `5M × 500B × 365 × 3 ≈ 2.7TB` - three orders of magnitude smaller than the blobs, so metadata storage is not worth further analysis here.

**Step 6 - Bandwidth:**
Read egress: `35,000 QPS × 200KB ≈ 7GB/s ≈ 56Gbps` at peak. Write ingress: `175 QPS × 200KB ≈ 35MB/s` - trivial by comparison.

**Step 7 - Dominant constraint, stated out loud:**
"Read bandwidth at ~56Gbps peak is the number that actually drives the architecture - that's well past what a single origin server or even a small fleet can serve directly, so this pushes toward a CDN for photo egress rather than serving reads from application servers. Storage at 3.3PB over 3 years is large but is an object-storage capacity-planning problem (S3-class storage scales horizontally without much design complexity), not an architectural bottleneck. Write QPS at 175/sec peak is low enough that a single reasonably-provisioned write path handles it without sharding. The photo-view read path, not the upload path, is where this design's decisions concentrate."

That last paragraph - not the seven numbers above it - is what the framework is for.

## Common Misapplications & Gotchas

- **Treating peak-QPS as the finish line** - the number only matters once it's connected to a design decision ("this rules out a single-node DB" / "this justifies a CDN"). A candidate who computes numbers and stops has done arithmetic, not estimation.
- **Silently picking a peak multiplier or DAU/MAU ratio** - state the assumption ("I'll assume DAU is roughly MAU/25 and a 3× evening peak") so the interviewer can push back on it if it's wrong for their scenario, rather than discovering later that a hidden assumption drove the whole design.
- **Conflating replication factor with growth projection** - they're separate multipliers (redundancy vs. organic growth over time) and collapsing them into one "safety margin" number hides which one actually dominates the storage total.
- **Chasing false precision** - spending two minutes getting a QPS figure from 11,400 to 11,600 wastes interview time the estimation step doesn't have; ±1 order of magnitude is the target, not the third significant figure.
- **Misconception: "bigger numbers mean I need a more complex architecture."** Not necessarily - the worked example above has 3.3PB of storage but that's *not* the bottleneck driving complexity, because object storage scales that horizontally almost for free. The estimation step's job is finding which number is disproportionately hard to satisfy with commodity scaling, not finding the largest number.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** The interviewer says "assume 10 million daily active users, each performing 5 actions per day, and stop me if you think that's wrong." How do you use that opening?
> **Ideal answer:** Convert to requests/day (50M), then average QPS (~580/sec), then immediately ask about the read/write split and whether there's a known peak pattern (daily cycle vs. flash-event) before going further - the ratio and multiplier change the downstream numbers by an order of magnitude, so getting them stated explicitly matters more than doing the division quickly.
> **Common trap:** Silently assuming a 1:1 read/write ratio and a fixed 2× peak multiplier without saying so, then building an architecture on numbers the interviewer never actually agreed to.
> **Next question:** The interviewer says traffic is heavily read-skewed with a 500:1 ratio - what does that change about where you spend design effort?

> 🎯 **Interview Lens**
> **Q:** You calculate 3.3PB of total storage over three years for a media app. Does that number, by itself, tell you anything about which database to pick?
> **Ideal answer:** Not much on its own - total volume mostly signals "use horizontally-scalable object storage for the blobs," which nearly every provider handles at that scale without exotic design. The database choice is driven by the *access pattern* (read/write ratio, consistency needs, query shape) more than raw volume; a large but simply-accessed dataset is often easier than a small dataset with complex query requirements.
> **Common trap:** Treating "big number" as automatically meaning "hard problem requiring a specialized system," when the actual constraint might be bandwidth, latency, or query complexity instead of volume.
> **Next question:** Now assume the same 3.3PB but with a requirement that any photo must be fully deletable (including all replicas and backups) within 24 hours of a user request - does that change your storage architecture choice?

> 🎯 **Interview Lens**
> **Q:** Your peak QPS estimate assumes a 3× multiplier over average, but the product is launching a one-day flash sale. What do you do with the estimation framework at that point?
> **Ideal answer:** Treat it as a separate capacity scenario rather than inflating the standing multiplier - state the flash-sale peak (which could be 20-100× baseline) explicitly, and note that steady-state infrastructure sized for 3× would fail outright; the design needs either autoscaling headroom, a queueing/waiting-room pattern, or pre-provisioned burst capacity for that window specifically.
> **Common trap:** Padding the "normal" peak multiplier up to 10× "just to be safe," which over-provisions every day of the year to cover a once-a-quarter event instead of designing burst handling for that event specifically.
> **Next question:** If the flash-sale write QPS is 50× the steady-state peak and the primary database can't sustain that write rate even briefly, what's your fallback?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| DAU | Daily Active Users | Distinct users active in a 24-hour window, the standard base unit for capacity derivations |
| MAU | Monthly Active Users | Distinct users active in a 30-day window, often converted to DAU via a stickiness ratio |
| QPS | Queries Per Second | Request rate, the primary unit capacity estimation resolves to before sizing infrastructure |

### Anti-patterns

- **Reporting a single QPS number with no read/write split** - hides that reads and writes usually hit entirely different bottlenecks; always split before sizing anything.
- **Using an unstated peak multiplier** - do the division in front of the interviewer with the multiplier named, not silently baked into a "rounded" final figure.
- **Solving for precision instead of the dominant constraint** - the goal of the whole exercise is naming the one number that shapes the architecture, not producing four equally-precise figures with no conclusion drawn from them.
