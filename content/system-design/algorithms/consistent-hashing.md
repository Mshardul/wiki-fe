# Consistent Hashing

## Prerequisites

- **Hash Functions** [Must read] <!-- link: ./hash-functions.md -->
- **[Load Balancer](../components/load-balancer.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [The Problem - Why Modulo Hashing Breaks](#the-problem--why-modulo-hashing-breaks)
- [The Ring](#the-ring)
- [Virtual Nodes](#virtual-nodes)
- [Rebalancing Impact](#rebalancing-impact)
- [Bounded-Load Consistent Hashing](#bounded-load-consistent-hashing)
- [When To Use](#when-to-use)
- [Often Confused With](#often-confused-with)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Appendices](#appendices)

---

## TLDR

Consistent hashing maps both nodes and keys onto a hash ring, assigning each key to the nearest node clockwise. Adding or removing a node remaps only `~1/N` of keys, versus `(N-1)/N` for plain modulo hashing (`hash(key) % N`) - which reshuffles nearly every key on any pool-size change. The mechanism alone produces uneven load (some nodes own larger ring arcs than others); virtual nodes fix this by placing each physical node at many ring positions.

**Interview soundbite:** Consistent hashing's real contribution isn't the ring - it's turning "which node owns this key" from a function of pool size into a function of position, so the answer barely changes when the pool does.

---

## What It Is

**Analogy:** think of a circular parking lot with numbered spaces (the ring). Cars (keys) pull in and always walk clockwise to the nearest attendant booth (node). If one booth closes, only the cars between it and the next booth need to find a new one - everyone else's assignment is untouched.

**Mental model:** consistent hashing is a hash function designed to be stable under the number of buckets changing, not just stable under the same key hashing to the same value.

---

## The Problem - Why Modulo Hashing Breaks

Naive hash-based routing computes `hash(key) % N` to pick one of `N` nodes. This works until `N` changes.

```
N = 10:  hash(key) % 10
N = 11:  hash(key) % 11   ← nearly every key's assignment changes
```

Because `%` is sensitive to the exact value of `N`, adding or removing a single node changes the divisor for every key, not just the keys that should logically move. In a cache or session-affinity context, this means a single node joining or leaving invalidates almost the entire cache or breaks almost every client's session affinity simultaneously.

> ⚠️ **Warning / Gotcha**
> This is not a hypothetical edge case - it happens on every autoscaling event, every rolling deploy, and every node failure. Any system using modulo hashing for routing experiences a full cache-cold event on ordinary infrastructure churn, not just outages.

---

## The Ring

**Formal definition:** nodes and keys are both hashed into the same output space (typically `[0, 2³²)` or `[0, 2⁶⁴)`), visualized as points on a circle. A key is assigned to the first node encountered walking clockwise from the key's position.

```
Ring (simplified, hash space 0 to 2³²):

    0
    │
  [B1] ← keys in this arc go to B1
    │
  [B2] ← keys in this arc go to B2
    │
  [B3] ← keys in this arc go to B3
    │
   2³²
```

**Lookup:** hash the key, walk clockwise (in practice: binary search over a sorted array of node positions) to find the first node position ≥ the key's hash. `O(log N)` per lookup with a sorted structure.

**On node removal:** only the keys in the arc between the removed node and its clockwise predecessor need reassignment - they now map to the next node clockwise. Every other key's assignment is untouched.

**On node addition:** the new node claims a slice of an existing node's arc. Only the keys in that reclaimed slice move; everything else stays put.

---

## Virtual Nodes

**The problem virtual nodes solve:** placing each physical node at exactly one ring position produces highly uneven arc sizes - with only a few nodes, one might randomly own 40% of the ring's circumference while another owns 5%, purely from where the hash function happened to place them.

**The fix:** hash each physical node to many positions on the ring (commonly 100-200 virtual nodes per physical node), rather than one. A key's owner is still "the first virtual node clockwise" - but now each physical node's total ring coverage is the sum of many small, independently-random arcs, which averages out close to `1/N` of the ring by the law of large numbers.

```
Physical node B1 → virtual positions: hash("B1-0"), hash("B1-1"), ..., hash("B1-149")
Physical node B2 → virtual positions: hash("B2-0"), hash("B2-1"), ..., hash("B2-149")
```

More virtual nodes per physical node → more even distribution, at the cost of a larger sorted position array (more memory, slightly slower lookups). 100-200 is the common production range; below ~20 the variance in load becomes noticeable.

> 🧠 **Thought Process**
> The virtual-node count is a knob, not a fixed constant - it's a direct trade-off between load-distribution smoothness and lookup-structure size. A system with only 3-4 physical nodes needs more virtual nodes per physical node to average out variance than a system with 500 physical nodes, where the law of large numbers already does most of the work.

### Gotcha - Too Few Virtual Nodes

Under-provisioning virtual node count is the most common misconfiguration: with a small physical node count and few virtual nodes each, load imbalance stays significant purely from hash randomness, even though the ring mechanism is implemented correctly. See [Common Misapplications & Gotchas](#common-misapplications--gotchas) for the fix.

---

## Rebalancing Impact

When a node joins or leaves a pool of `N` nodes, consistent hashing remaps approximately `1/N` of all keys - specifically, only the keys that were owned by (on removal) or now fall within (on addition) the affected node's arc(s) across all its virtual positions.

Compare directly to modulo hashing:

| Pool change            | Modulo hashing (`% N`) | Consistent hashing |
| ----------------------- | -------------------------- | ---------------------- |
| Keys remapped on 1 node change | `(N-1)/N` (nearly all)      | `~1/N` (a small fraction) |
| Example at N=10        | ~90% of keys move            | ~10% of keys move        |

This is the entire value proposition of the technique - it bounds the "blast radius" of a pool-size change to roughly its proportional share, rather than the whole keyspace.

---

## Bounded-Load Consistent Hashing

**The problem this extension solves:** even with virtual nodes smoothing average load, consistent hashing gives no guarantee against a single node becoming a hot spot from clustered or adversarial key distributions - the ring assignment is a function of hash values, not real-time load.

**The mechanism (Google's "Consistent Hashing with Bounded Loads"):** cap each node's assigned load at `c × (average load)` for a tunable `c` slightly above 1 (e.g. 1.25). When a key's natural ring-clockwise node is already at its cap, the key overflows to the next node clockwise instead. This trades a small amount of the "few keys move" property for a hard ceiling on per-node imbalance.

Used in systems where a small number of extremely popular keys (celebrity accounts, viral content) could otherwise overload a single node despite virtual nodes being correctly configured.

---

## When To Use

Reach for consistent hashing when you need **both** backend affinity (the same key should usually land on the same node, for cache warmth or session locality) **and** a pool that changes over time (autoscaling, rolling deploys, node failures). If the pool is static, plain modulo hashing is simpler and equally correct. If you don't need affinity at all, any load-aware algorithm (least connections, round robin) is simpler and doesn't require ring maintenance.

DynamoDB and Cassandra both use consistent hashing (with virtual nodes) as their core partitioning mechanism for exactly this reason - node membership changes constantly in a large cluster, and both need key-to-node affinity for read/write quorums. At scale (thousands of nodes), the failure mode is ring imbalance from token placement skew, not remap volume - a small number of physical nodes ending up responsible for disproportionate ring arcs even with virtual nodes, degrading into hot-partition problems that bounded-load extensions specifically target.

> ⚖️ **Decision Framework**
> Stable pool + need affinity → modulo hashing is fine, simpler. Changing pool + need affinity → consistent hashing. Changing pool + no affinity requirement → skip this entirely, use least connections or round robin. The key you hash matters too: hashing on client IP collapses under NAT (thousands of users, one IP); prefer a session ID, user ID, or request attribute that has genuine per-client diversity.

---

## Often Confused With

**Rendezvous hashing (HRW - Highest Random Weight):** no ring at all. Each key is scored against every node via a combined hash `hash(key, node)`, and the key goes to the node with the highest score. Same `~1/N` remap-minimality property as consistent hashing, without virtual nodes or a sorted position structure - but every lookup is `O(N)` (score against all nodes) unless indexed, versus consistent hashing's `O(log N)`. Prefer HRW when node count is small and simplicity beats lookup speed; prefer consistent hashing when node count is large enough that `O(N)` scoring is the bottleneck.

**<abbr>Sharding</abbr> with a remap table:** some systems avoid the `~1/N` remap cost entirely by keeping an explicit key-range-to-shard mapping table, updated by a coordinator on rebalance (not a hash function at all). This trades "moves are hash-determined and stateless" for "moves are coordinator-controlled and can be planned" - useful when rebalancing needs to be gradual and scheduled rather than immediate.

---

## Common Misapplications & Gotchas

**Hashing on the wrong key.** Using source IP as the hash key collapses badly behind corporate NAT or carrier-grade NAT - thousands of distinct users share one public IP, so they all land on the same node regardless of how well-tuned the ring is. Prefer a session ID or user ID with real per-entity diversity.

**Too few virtual nodes.** With a small physical node count and few virtual nodes each, load imbalance can still be significant (one node getting meaningfully more than `1/N` of keys) purely from hash randomness. Increase virtual node count, don't just add more physical capacity and expect it to self-balance.

**Assuming zero keys move on a pool change.** Consistent hashing bounds the blast radius to `~1/N`, it doesn't eliminate remapping. Systems relying on this for cache warmth still see a real, if much smaller, cold-key rate on every scaling event - size cache eviction/backfill capacity accordingly.

### Common Misconceptions

**"Consistent hashing guarantees even load distribution."** No - it guarantees *minimal remapping* on pool changes. Even distribution is a separate property that only virtual nodes provide, and even then only approximately (law-of-large-numbers averaging, not a hard guarantee). The two properties are independent; a ring can minimize remap and still be unevenly loaded if virtual node count is too low.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why not just use `hash(key) % N` and call it a day?
> **Ideal answer:** Because `N` changing (autoscaling, node failure, rolling deploy) reshuffles roughly `(N-1)/N` of all keys - nearly everything - even though only one node changed. Consistent hashing bounds that to `~1/N` by placing nodes and keys on a shared ring instead of using the pool size as a divisor.
> **Common trap:** Describing the ring mechanism but forgetting virtual nodes - without them, a small number of physical nodes produces visibly uneven arc sizes and real load imbalance, even though the "few keys move on resize" property still holds.
> **Next question:** "A handful of your keys get 100x normal traffic - does consistent hashing handle that?" → Not by default; the ring balances by *key count*, not by *load per key*. Bounded-load consistent hashing caps each node's load and overflows excess to the next node clockwise, specifically for this case.

> 🎯 **Interview Lens**
> **Q:** How do virtual nodes actually improve load distribution - why not just use more physical nodes?
> **Ideal answer:** Virtual nodes give each physical node many independently-random arcs on the ring instead of one, so by the law of large numbers the sum converges close to `1/N` of the ring. It's a statistical smoothing technique, not a capacity change - physical node count is a capacity decision, virtual node count is a distribution-smoothness knob.
> **Common trap:** Conflating "more virtual nodes" with "more capacity." They're orthogonal - you can raise virtual node count on the same physical fleet purely to smooth load, with no added compute.
> **Next question:** "What's the cost of raising virtual node count from 150 to 1000 per physical node?" → Larger sorted position array to binary-search over (more memory, marginally slower `O(log N)` lookups) - real but usually negligible next to network/IO cost per request.

> 🎯 **Interview Lens**
> **Q:** Does consistent hashing eliminate the "cache stampede on deploy" problem?
> **Ideal answer:** It reduces it, doesn't eliminate it. Blast radius drops from `(N-1)/N` to `~1/N` of keys, but that `~1/N` still goes cold simultaneously on every node-pool change - rolling deploys during peak traffic still need backfill/eviction capacity sized for that fraction, not zero.
> **Common trap:** Assuming "minimal remapping" means "no remapping" and under-provisioning cache backfill capacity as a result.
> **Next question:** "Your ring has 200 nodes and you're doing a rolling deploy of all of them. What's the actual cold-key exposure?" → Roughly `~1/200` per single node cycled, but if the deploy cycles all 200 sequentially without pause, cumulative exposure approaches the full keyspace over the rollout window - the bound is per-change, not per-deploy.

---

## Appendices

### Acronyms & Abbreviations

None specific to this article.

### Selection Matrix

| Dimension                     | Modulo Hashing (`% N`) | Consistent Hashing        | Consistent Hashing + Bounded Load |
| -------------------------------- | -------------------------- | ------------------------------ | -------------------------------------- |
| Keys remapped on pool change   | `(N-1)/N`                    | `~1/N`                            | `~1/N`                                    |
| Handles hot keys                | No                            | No                                | Yes (capped per-node load)                |
| Implementation complexity      | Trivial                      | Moderate (ring + virtual nodes)   | Higher (load tracking + overflow)         |
| Best for                       | Static pools                 | Dynamic pools needing affinity    | Dynamic pools with skewed key popularity  |
