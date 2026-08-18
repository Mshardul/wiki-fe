# Bloom Filter

## Prerequisites

- **Hash Functions** [Must read] <!-- link: ./hash-functions.md -->

## Table of Contents

- [Prerequisites](#prerequisites)
- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Formal Definition](#formal-definition)
- [Assumptions & Preconditions](#assumptions--preconditions)
- [Core Mechanics](#core-mechanics)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [Performance & Complexity](#performance--complexity)
- [Real-World Applications](#real-world-applications)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A Bloom filter is a fixed-size bit array plus `k` hash functions that answers "have I possibly seen this before?" in O(k) time using a fraction of the memory a hash set would need. It trades certainty for space: false positives are possible ("maybe present" can be wrong), false negatives are not ("definitely absent" is always correct). The core decision it enables is skipping expensive lookups (disk reads, cache misses, network calls) for keys that provably don't exist, at the cost of tuning a false-positive rate against memory and hash-function count. It cannot delete entries or enumerate its contents - both are lost the moment a single bit represents multiple keys.

## Mental Model

**A Bloom filter is a bouncer's memory of faces, not a guest list.** The bouncer doesn't write down every name - too much paper. Instead, for each guest, they commit a few distinctive features (haircut, jacket color, height) to memory. Later, someone claims to have been here before: if any of those features don't match anyone the bouncer remembers, they're definitely lying ("no false negatives"). But if all the features happen to match some combination of past guests, the bouncer might wrongly admit a stranger ("false positive") - because features get reused across many different guests and the bouncer only remembers features, not identities. A Bloom filter is that bouncer's memory: a set of bits (features) shared across every key ever inserted, with no way to trace a bit back to a specific key or erase just one guest's contribution.

## Formal Definition

A Bloom filter is a probabilistic set-membership structure over an `m`-bit array `B` and `k` independent hash functions `h1..hk`. Insert(`x`) sets `B[hi(x) mod m] = 1` for each `i`. Query(`x`) returns "possibly present" if all `k` positions are 1, and "definitely absent" if any is 0.

## Assumptions & Preconditions

- **Hash functions must be independent and uniformly distributed** over `[0, m)`. Correlated or skewed hashes concentrate collisions in fewer bits, inflating the false-positive rate far past the theoretical estimate.
- **`m` and `k` must be sized for the expected element count `n` up front.** The structure has no notion of "resize" - see the Core Mechanics gotcha for what happens once `n` outgrows that sizing.
- **Deletion is undefined on a standard Bloom filter.** Clearing a bit to represent "remove key X" can also un-set a bit that a still-present key Y depends on, silently turning Y into a false negative - which breaks the one guarantee (no false negatives) the whole structure exists to provide.
- **Keys are assumed hashable and the query set is assumed to genuinely benefit from a negative-skip.** If most queries are for keys that *are* present, the "skip absent lookups" value proposition doesn't apply and the filter just adds overhead.

## Core Mechanics

**Insert:** for key `x`, compute `h1(x), h2(x), ..., hk(x)`, each mapped into `[0, m)`, and set all `k` corresponding bits in `B` to 1. Bits already set by a previous insert simply stay 1 - inserts never conflict or overwrite.

**Query:** for key `x`, compute the same `k` hash positions and check `B` at each. If **any** bit is 0, `x` was definitely never inserted - return "absent" with certainty. If **all** `k` bits are 1, `x` **might** have been inserted - return "possibly present." That "might" is the entire trade-off: those bits could all be 1 purely from the union of other keys' inserts, with `x` never having touched the filter.

```
insert(x):
  for i in 1..k:
    B[hash_i(x) mod m] = 1

query(x):
  for i in 1..k:
    if B[hash_i(x) mod m] == 0:
      return ABSENT          # certain
  return POSSIBLY_PRESENT     # probabilistic
```

In practice, `k` hash values are rarely computed with `k` independent hash functions. **Kirsch-Mitzenmacher double hashing** derives all `k` positions from two base hashes: `hash_i(x) = h1(x) + i * h2(x) mod m`. This is the mechanism nearly every production implementation uses - it's statistically equivalent to independent hashing but only costs two real hash computations regardless of `k`.

The false positive isn't a bug in the structure - it's bit reuse across keys, made visible below with `m = 16`, `k = 3`. `"cat"` and `"dog"` are inserted; `"fox"` is never inserted but its three hash positions all happen to land on bits already set by the union of `"cat"` and `"dog"`'s inserts:

```
index:   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
B:       0   1   0   0   1   0   1   0   0   0   1   0   0   0   0   0

"cat"  -> h1=1, h2=4, h3=10        (sets bits 1, 4, 10)
"dog"  -> h1=6, h2=1, h3=4         (sets bits 6, 1, 4  - bit 1 and 4 already set by "cat")

"fox"  -> h1=6, h2=4, h3=10        (never inserted)
           |    |    |
           v    v    v
          B[6]=1 B[4]=1 B[10]=1   -> all three bits already 1 from "cat"/"dog" -> FALSE POSITIVE
```

`"fox"` never touched the filter, but every one of its hash positions collides with a bit some other key already set - `B[4]` and `B[10]` came from `"cat"`, `B[6]` came from `"dog"`. Query(`"fox"`) checks only the bits, not who set them, so it returns `POSSIBLY_PRESENT`. This is the mechanism the rest of this article calls "false positive rate": the more keys share the array, the more of these accidental all-1 collisions occur.

⚠️ **Gotcha:** the false-positive rate isn't a fixed constant of the filter - it climbs as more elements are inserted, because each insert sets more bits to 1 and there's no mechanism to reverse that. A filter sized for 1M keys that receives 5M inserts doesn't error out; it silently returns "possibly present" for almost everything, having quietly become useless as a skip-check.

## Often Confused With

| | Bloom Filter | Hash Set / Hash Table |
| --- | --- | --- |
| Space per element | ~1.44 log2(1/ε) bits, sublinear, independent of key size | O(key size), stores the actual key |
| False positives | Yes, tunable rate | Never |
| False negatives | Never | Never |
| Deletion | Not supported (standard variant) | O(1) |
| Enumeration of members | Impossible | Trivial (iterate) |
| Use case | "Can I skip this lookup?" | "Give me the value for this key" |

A Bloom filter is not a cache and not a replacement for the source of truth - it sits **in front of** one, filtering out queries that would otherwise waste a lookup on a key that was never there. "Possibly present" always still requires the real check against the underlying store; only "definitely absent" short-circuits it.

## Variants & Extensions

| Variant | What it adds | Trade-off vs standard |
| --- | --- | --- |
| **Counting Bloom Filter** | Each slot is a small counter (e.g. 4 bits) instead of 1 bit; increments on insert, decrements on delete | Supports deletion, at 4-8x the memory and a small risk of counter overflow under heavy reuse |
| **Cuckoo Filter** | Stores a fingerprint per key in a cuckoo hash table instead of shared bits | Supports deletion natively, similar or better space efficiency at low false-positive rates, but fingerprint collisions can still false-positive and table can fail to insert past ~95% load |
| **Scalable Bloom Filter** | Chains multiple filters, adding a new one (with a tighter target FP rate) as the current one saturates | Removes the fixed-`n` sizing assumption, at the cost of a query touching multiple filters as the chain grows |
| **Blocked/Partitioned Bloom Filter** | Splits `B` into cache-line-sized blocks; one block chosen per key, all `k` hashes land inside it | Much better cache locality (one cache line touched per query instead of `k` scattered lines), marginally higher false-positive rate than the unpartitioned form for the same `m` |

Common case in interviews is the standard bit-array filter; reach for Counting or Cuckoo the moment "can this key be removed?" comes up as a requirement.

## Performance & Complexity

- **Insert / Query:** O(k) time, independent of the number of elements already inserted `n` - this is the headline property that makes it attractive at scale over a hash set lookup that (in the worst case, or in a distributed hash set requiring a network hop) doesn't stay O(1).
- **Space:** `m = -(n ln ε) / (ln 2)^2` bits for `n` expected elements and target false-positive rate `ε` - roughly **1.44 x log2(1/ε) bits per element**, independent of how large the actual keys are. At `ε = 1%`, that's about **9.6 bits per element**; at `ε = 0.1%`, about **14.4 bits per element**. Compare to a hash set storing full keys (often 8-64+ bytes each) - the Bloom filter's win grows with key size.
- **Optimal `k`:** `k = (m/n) ln 2` minimizes the false-positive rate for a given `m` and `n`. Too few hash functions under-utilizes the bit array's discriminating power; too many saturates it faster than necessary, actually raising the false-positive rate.
- **Why the formula holds:** after inserting `n` keys with `k` hashes each, the probability any single bit is still 0 is roughly `(1 - 1/m)^(kn)`, since each of the `kn` hash writes independently misses that bit with probability `(1 - 1/m)`. A query false-positives only if all `k` of its bits are 1, so `ε ≈ (1 - (1 - 1/m)^(kn))^k`, which approximates to `(1 - e^(-kn/m))^k` for large `m`. Minimizing that expression over `k` is what produces `k = (m/n) ln 2` - the intuition is that `ε` is a race between "more hash functions narrow the query" and "more hash functions set more bits per insert," and the optimum is where those two effects balance.
- ⚖️ **Decision Framework:** the memory-vs-accuracy dial is `m` (and derived `k`) - halving `ε` costs a roughly linear increase in bits-per-element, not a linear increase in absolute risk reduction (going from 1% to 0.01% FP rate costs meaningfully more bits than going from 10% to 1%, because of the log(1/ε) term). Size for the FP rate the downstream cost of a false positive can tolerate, not for the smallest ε achievable.

## Real-World Applications

Bloom filters are a workhorse in LSM-tree storage engines - Cassandra, HBase, and RocksDB each attach one Bloom filter per on-disk SSTable so a point read can skip opening files that provably don't contain the key, which is the single biggest lever against LSM read amplification. The LSM-specific symptom of the Core Mechanics sizing gotcha: filters are typically sized once at compaction time, so a highly skewed workload that keeps writing into an old SSTable's key range past its original sizing quietly loses its read-amplification win - reads against that file start hitting disk again exactly where the filter was supposed to short-circuit them.

## Common Misapplications & Gotchas

⚠️ **Gotcha:** treating "possibly present" as "present" and skipping the real lookup entirely - that turns every false positive into a silent correctness bug (e.g. skipping a duplicate-submission check because the Bloom filter said "seen it" when it hadn't). The filter narrows the search, it never replaces it.

⚠️ **Gotcha:** deleting from a standard (non-counting) Bloom filter by clearing bits. Because bits are shared across keys via hash collisions, clearing a bit for one key's removal can make an unrelated still-present key start returning false negatives - the one guarantee the whole structure promises.

⚠️ **Gotcha:** treating sizing as a one-time setup step with no operational follow-up (see Core Mechanics for the degradation itself). There's no runtime metric that fires on its own - someone has to actively track actual `n` against the sized `n` and either rebuild at a larger `m`/`k` or rotate to a new filter (Scalable variant) before the drift becomes a production incident.

### Common Misconceptions

- "A Bloom filter can tell you a key is definitely present" - it cannot; it can only ever say "definitely absent" or "possibly present." The certainty is one-directional.
- "More hash functions is always better" - past the optimal `k = (m/n) ln 2`, adding more hash functions sets more bits per insert and *raises* the false-positive rate rather than lowering it.
- "A Bloom filter is a compressed hash set you can still enumerate or query the original keys from" - it stores no keys and no key-to-bit mapping; membership is the only operation it supports, and it's probabilistic even for that.

## Interview Scenario Bank

> 💬 **Opening framing:** "Before picking a structure, I'd confirm the guarantee this needs: can we tolerate an occasional wrong 'maybe seen it' if it's cheap to double-check, but never a wrong 'definitely not seen it'? If so, a Bloom filter buys us a big memory win over storing the full key set, at the cost of tuning a false-positive rate against `m` and `k` for the expected key count - and I'd flag up front whether deletion is a real requirement, since that changes the variant."

> 🎯 **Interview Lens**
> **Q:** You're adding a check-if-username-exists filter in front of your database to cut load - a strong candidate should immediately clarify: is a wrong "yes" acceptable here, and can this structure ever tell you "no" incorrectly?
> **Ideal answer:** Structure needs zero false negatives (never wrongly reject a username that's actually free) but can tolerate a small false-positive rate (occasionally still hitting the DB for a username that turns out to be free) - a bit array with k hash functions, size chosen from target FP rate and expected key count.
> **Common trap:** Reaching for a regular hash set without asking about memory budget at the actual key-count scale, or building the filter without asking whether entries ever need to be removed (usernames being freed up).
> **Next question:** If usernames can later be deleted and reused, what changes about your data structure choice?
> **Next question:** How do you decide the bit-array size before you've seen production traffic?

> 🎯 **Interview Lens**
> **Q:** Your team is debugging why a duplicate-payment-detection system occasionally lets a real duplicate through - what's your first hypothesis given the detector is described as "a fast in-memory structure that flags seen transaction IDs"?
> **Ideal answer:** That's the expected behavior of a probabilistic filter under a growing key count, not a bug - if inserts have outpaced the structure's sizing, the false-positive rate for "have I seen this" has drifted, but that only explains false *positives* (flagging a fresh ID as seen), not letting a real duplicate through as fresh - so the actual bug is more likely a rotated/re-created filter losing prior inserts, or a delete happening on a structure that can't safely delete.
> **Common trap:** Assuming the structure guarantees no duplicates ever slip through in either direction, without checking which direction (false-positive vs false-negative) the guarantee actually holds for.
> **Next question:** What would you change about the delete path to fix this cleanly?

> 🎯 **Interview Lens**
> **Q:** You're told to cut this structure's memory footprint by 4x with the same key count - what's your first move, and what do you give up?
> **Ideal answer:** Shrinking `m` (or equivalently, targeting a higher ε) directly trades memory for a higher false-positive rate along the `m = -(n ln ε) / (ln 2)^2` relationship - state the new expected FP rate and confirm downstream cost of a false positive still tolerates it, rather than just shrinking blindly.
> **Common trap:** Reducing `k` (hash function count) as the lever instead of `m`, without recomputing the optimal `k = (m/n) ln 2` for the new size - an unoptimized `k` gives a worse FP rate than necessary for the memory spent.
> **Next question:** At what point does shrinking further stop being worth it compared to just accepting the extra downstream lookups?

> 🎯 **Interview Lens**
> **Q:** A read-heavy storage engine's on-disk file count has grown 20x since launch, and P99 read latency has crept up even though nothing else changed - the per-file skip structure was sized once at launch. What's your diagnosis?
> **Ideal answer:** The skip structure's false-positive rate rises as the real key count outgrows what it was sized for, so more reads that should have been skipped now fall through to an actual disk read - the fix is re-sizing per file at write/compaction time (or rotating to a chained structure) rather than reusing a launch-time size indefinitely.
> **Common trap:** Assuming the skip structure is a fixed one-time cost that can't degrade, and looking for the latency regression somewhere else in the read path first.
> **Next question:** How would you monitor for this drift before it shows up as a latency regression in production?

> 🎯 **Interview Lens**
> **Q:** You're deciding whether to put this probabilistic skip-check in front of a cache or in front of the origin database - does it matter which layer it guards?
> **Ideal answer:** It's most valuable in front of whichever layer has the highest per-miss cost - guarding a cache (cheap misses) saves little, guarding the origin store (disk seek or cross-region call) turns every avoided miss into a real cost saved, so the structure should sit as close to the expensive layer as possible.
> **Common trap:** Treating "add it somewhere in the read path" as sufficient without reasoning about which layer's miss is actually expensive.
> **Next question:** If the cache and the origin store both sit behind this check, does one structure in front of the cache also protect the origin store?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| FP | False Positive | Filter says "possibly present" for a key that was never inserted |
| LSM | Log-Structured Merge (tree) | Write-optimized storage engine layout that Bloom filters commonly front |

### Anti-patterns

- Using a Bloom filter as the source of truth - it never replaces the real store; a "possibly present" hit must still be verified against it.
- Deleting from a standard bit-array Bloom filter by clearing bits - use a Counting or Cuckoo variant instead if deletion is a real requirement.
- Sizing `m` and `k` once and never revisiting them as `n` grows - false-positive rate degrades silently, not with an error.

### Selection Matrix

| | Standard Bloom | Counting Bloom | Cuckoo Filter | Scalable Bloom |
| --- | --- | --- | --- | --- |
| Deletion | No | Yes | Yes | No (per sub-filter) |
| Relative memory | Lowest | 4-8x standard | Comparable or better at low ε | Grows with chain length |
| Grows past sized `n` | Degrades silently | Degrades silently | Fails to insert near full load | Handles growth by design |
| Pick it when | Fixed key count, no deletes | Need deletes, memory is not the tightest constraint | Need deletes and best space efficiency at low ε | Key count unknown or unbounded upfront |
