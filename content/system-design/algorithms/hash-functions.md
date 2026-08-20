# Hash Functions

## Prerequisites

None - this is a foundational concept.

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Formal Definition](#formal-definition)
- [What Makes a Hash Function Suitable for Distributed Systems](#what-makes-a-hash-function-suitable-for-distributed-systems)
- [Non-Cryptographic vs Cryptographic Hash Families](#non-cryptographic-vs-cryptographic-hash-families)
- [Collisions and the Birthday Paradox](#collisions-and-the-birthday-paradox)
- [Often Confused With](#often-confused-with)
- [Real-World Applications](#real-world-applications)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A hash function maps arbitrary-size input to a fixed-size output deterministically, and distributed systems care about exactly three properties of that mapping: uniformity (outputs spread evenly), avalanche effect (tiny input changes flip the output unpredictably), and speed. Non-cryptographic hashes (MurmurHash, xxHash, FNV) win on speed and are the default for routing/partitioning/dedup; cryptographic hashes (SHA-256) trade speed for collision-resistance against an adversary. This single mapping underlies consistent hashing, sharding, bloom filters, and deduplication.

---

## Mental Model

**Analogy:** a hash function is a deterministic blender - the same fruit (input) always comes out as the same smoothie (output), completely different fruits usually make visibly different smoothies, and you can never pour the smoothie back into the original fruit.

**Mental model:** a hash function is a many-to-one function that compresses an unbounded input space into a fixed-size output space, and everything interesting about it - uniformity, avalanche, one-wayness - is really a statement about how well it disguises structure in the input so the output looks uniformly random.

---

## Formal Definition

**Formal definition:** a hash function `h` maps input of any length to output of a fixed length `n`, such that `h(x)` is deterministic (same `x` always yields the same `h(x)`) and computable in time proportional to the input's length. Everything beyond this - uniformity, avalanche, collision resistance - is a *design goal* layered on top, not part of the base definition; a function that just returns the first `n` bits of the input technically satisfies the formal definition but is useless in practice.

---

## What Makes a Hash Function Suitable for Distributed Systems

A function that merely satisfies the formal definition above is not automatically useful for routing keys to nodes or deduplicating records. Four properties separate a production-grade hash function from a toy one.

### Determinism

The same key must hash to the same value every time, on every machine, in every process. This sounds trivial but rules out anything seeded from non-reproducible state (wall-clock time, memory addresses, unseeded randomness) and is the property every downstream use - routing, caching, sharding - silently depends on. A hash function that is deterministic within a process but not across process restarts (e.g. Python's default string hash before `PYTHONHASHSEED` is fixed) breaks distributed agreement the moment two nodes disagree on where a key belongs.

### Uniformity

Output values should be spread evenly across the entire output space, regardless of patterns in the input. If a hash function clusters real-world keys (sequential IDs, timestamps, common English words) into a narrow band of its output range, every downstream consumer inherits that skew: a shard gets 3x the traffic, a hash table degrades toward a linked list, a bloom filter's bits saturate unevenly. Uniformity is empirically tested by hashing a large, realistic key sample and checking the output distribution (chi-squared test, or simply bucketing and eyeballing variance) - it is not something to assume from a function's name or popularity.

### Avalanche Effect

Changing a single input bit should flip roughly half the output bits, unpredictably. This is what makes "adjacent" keys (`user-1000`, `user-1001`) land in unrelated parts of the output space instead of clustering next to each other. Without avalanche, sequential or near-duplicate keys - extremely common in real systems (auto-increment IDs, timestamped events) - would map to adjacent hash values, defeating uniformity even though the function's overall output distribution looks fine on random test data.

> 🧠 **Thought Process**
> Uniformity and avalanche are related but distinct: uniformity is a *global* property (is the output space used evenly across all inputs), avalanche is a *local* property (does a tiny input perturbation cause a large, unpredictable output change). A function can be globally uniform on random inputs yet fail avalanche on structured inputs like sequential IDs - which is exactly the input pattern distributed systems see constantly. Test both, not just one.

### Speed vs Cryptographic Strength

Every routing decision (which shard, which cache node, which bloom filter bit) sits on the hot path of every request, so hash computation speed is a direct latency and throughput cost multiplied by request volume. Cryptographic strength - specifically, being computationally infeasible to invert or to find two inputs producing the same output on purpose - costs CPU cycles the vast majority of internal routing decisions do not need, because the "attacker" is usually just an unlucky data distribution, not an adversary deliberately crafting collisions. This is the central design fork covered next: pick speed by default, pick cryptographic strength only when an adversary is genuinely in the threat model.

> ⚖️ **Decision Framework**
> No adversary, hot path, high volume (routing, sharding, in-memory hash tables, bloom filters) → non-cryptographic hash, optimize for speed and avalanche. Adversary can choose or influence input (user-supplied filenames used as cache keys, public-facing dedup where a malicious actor benefits from forcing a collision, anything security-adjacent like password storage or content integrity) → cryptographic hash, accept the speed cost. The mistake in both directions is real: using MD5/SHA on an internal hot path wastes CPU for a threat model that doesn't exist; using a non-cryptographic hash where user input is adversarial opens the system to deliberately engineered collisions (hash-flooding denial-of-service).

---

## Non-Cryptographic vs Cryptographic Hash Families

### Non-Cryptographic Hashes

Built for speed and good statistical distribution, with no guarantee against a determined adversary crafting a collision on purpose.

- **MurmurHash** - widely used for hash-table and partitioning use cases; fast, good avalanche, multiple versions (MurmurHash3 is current). Common default in distributed data stores' partitioning logic.
- **xxHash** - newer, optimized further for raw throughput (often the fastest of this group on modern CPUs), used where hashing large volumes of data (deduplication over big datasets, checksumming) is the bottleneck.
- **FNV (Fowler-Noll-Vo)** - simple, easy to implement in one line, historically popular for hash tables; weaker distribution than Murmur/xxHash on adversarial or structured input, still fine for small internal tables.
- **CityHash / FarmHash** - Google-originated, optimized for short strings (typical of keys in production systems), FarmHash is CityHash's successor with better mixing.

### Cryptographic Hashes

Built so that, even for an adversary who controls the input, finding a collision or inverting the hash is computationally infeasible.

- **SHA-family (SHA-256, SHA-3)** - current standard for integrity verification, content-addressable storage, digital signatures. Slower than the non-cryptographic family, deliberately.
- **MD5** - fast and historically common for checksums, but cryptographically broken (deliberate collisions are cheap to construct) - still acceptable for non-adversarial integrity checks (did this file get corrupted in transit) but never acceptable where an adversary benefits from forcing a collision.

| Dimension | Non-Cryptographic (Murmur/xxHash/FNV/CityHash) | Cryptographic (SHA-family/MD5) |
| --- | --- | --- |
| Primary goal | Speed + statistical uniformity | Collision/inversion resistance under adversarial input |
| Typical throughput | GB/s range | Meaningfully slower, by design |
| Collision resistance | None assumed against a deliberate attacker | Core design goal (except broken MD5) |
| Typical use | Routing, sharding, hash tables, bloom filters, checksums | Password storage, content integrity, digital signatures, dedup with untrusted input |
| Pick when | Internal, high-volume, no adversary | Adversary can supply or influence the input |

> ⚠️ **Warning / Gotcha**
> "Cryptographic" and "collision-resistant against random chance" are not the same claim. Even a cryptographic hash has non-zero collision probability from pure chance at large enough scale (see [Collisions and the Birthday Paradox](#collisions-and-the-birthday-paradox)) - cryptographic strength means an adversary can't *deliberately engineer* a collision cheaply, not that collisions become impossible.

---

## Collisions and the Birthday Paradox

Because a hash function maps an unbounded input space into a fixed-size output space, collisions - two different inputs producing the same output - are mathematically guaranteed to exist (pigeonhole principle). The interview-relevant question is never "can collisions happen" but "how many items until one is likely."

**The birthday paradox intuition:** in a room of just 23 people, there's a >50% chance two share a birthday, despite only 365 possible birthdays - far fewer people than the "365 to guarantee a match" naive intuition suggests. The same math applies to hash outputs: with an `n`-bit hash (`2^n` possible outputs), the 50%-collision-probability point arrives after roughly `2^(n/2)` items, not `2^n`. This square-root relationship is why a 32-bit hash (4 billion possible outputs) starts producing collisions at only tens of thousands of items, while a 128-bit hash needs on the order of `2^64` items before collisions become likely.

| Hash size | Output space (`2^n`) | ~50% collision point (`2^(n/2)`) |
| --- | --- | --- |
| 32-bit | ~4.3 billion | ~77,000 items |
| 64-bit | ~1.8×10¹⁹ | ~4 billion items |
| 128-bit | ~3.4×10³⁸ | ~1.8×10¹⁹ items |

This directly drives capacity decisions: a system expecting tens of millions of keys cannot safely use a 32-bit hash for anything where a collision is a correctness bug (deduplication, content addressing) - the birthday bound, not intuition about "4 billion possible values sounds like a lot," tells you when to move to 64-bit or 128-bit output.

> 🧠 **Thought Process**
> The birthday-paradox math only matters where a collision is a *correctness* problem. For routing/sharding, a collision just means two keys land on the same node - harmless, expected, and handled by the routing scheme itself (that's what a hash table's chaining or a shard's key space is designed for). For deduplication or content-addressable storage, a collision means two *different* pieces of content are treated as identical - a real bug. Always ask which category the use case falls into before deciding how many output bits are enough.

---

## Often Confused With

**Hashing vs encryption:** hashing is one-way and lossy (you cannot recover the input from the output, and multiple inputs can map to one output); encryption is two-way and lossless by design (the whole point is recovering the exact plaintext with the right key). A hash function has no "key" to reverse it with - that's the property, not a missing feature.

**Checksum vs cryptographic hash:** a checksum (CRC32) is built to catch *accidental* corruption cheaply and fast; it is trivial for an adversary to construct a corrupted payload with the same CRC32 on purpose. A cryptographic hash is built to resist that adversarial construction. Using CRC32 where input is adversarial (e.g. validating uploaded file integrity from untrusted users) is a security gap, not just a weaker checksum.

---

## Real-World Applications

Hash functions are the load-bearing primitive underneath several other system-design mechanisms, each of which owns its own full depth:

- **[Consistent Hashing](./consistent-hashing.md)** - places both nodes and keys on a hash ring using a fast, uniform, avalanche-having hash function; the properties above are exactly what make ring position assignment behave predictably under key churn.
- **Sharding** - a hash function's output (often via `hash(key) % shard_count` or consistent hashing) decides which physical shard owns a key; uniformity here directly determines whether shards carry balanced load.
- **[Bloom Filters](./bloom-filter.md)** - use several independent hash functions per inserted item to set bits in a bit array; uniformity and independence between the hash functions directly determine the filter's false-positive rate. <!-- link: ./bloom-filter.md -->
- **Deduplication / content-addressable storage** - a cryptographic hash (or a large-output non-cryptographic one) of content becomes its identity; two objects with the same hash are treated as the same object, which is why collision resistance at the birthday bound matters here specifically.

> 🧠 **Thought Process**
> Notice the pattern: routing-style uses (sharding, consistent hashing, hash tables) only need uniformity and speed - a collision is cheap and expected, absorbed by the data structure. Identity-style uses (dedup, content addressing) need collision resistance at real scale, because a collision there is silently treating two different things as one. The same underlying primitive, two very different bars for "good enough," driven entirely by what happens when a collision occurs.

---

## Common Misapplications & Gotchas

**Using a cryptographic hash for internal routing "to be safe."** This burns CPU on every request for a threat model (adversarial collision) that doesn't exist when the input space is internal keys, not attacker-controlled data. Default to a non-cryptographic hash unless the input is genuinely adversarial.

**Assuming a hash function's output looks random on any input.** Uniformity and avalanche are properties measured against realistic key distributions, not guaranteed by the function's name or reputation. A hash function that performs well on random test strings can still cluster badly on a real system's actual key pattern (sequential IDs, shared prefixes) - validate against real data, not synthetic benchmarks.

**Non-deterministic hashing across processes.** Some language-runtime default hash functions (e.g. unsalted string hashing) are intentionally randomized per-process to prevent hash-flooding attacks. Using the runtime default for a distributed routing decision - rather than a fixed, explicit hash function - breaks agreement the moment two nodes compute different hashes for the same key.

### Common Misconceptions

**"A collision means the hash function is broken."** No - collisions are mathematically guaranteed by the pigeonhole principle for any hash function (unbounded input space, fixed output space). The question is never whether collisions can happen but how likely they are at the system's actual scale ([birthday paradox](#collisions-and-the-birthday-paradox)) and whether a collision there is harmless (routing) or a correctness bug (dedup).

**"Cryptographic hashes are strictly better, so just use one everywhere."** No - cryptographic strength is a specific defense against a specific threat (adversarial collision construction) purchased at a real speed cost. Using SHA-256 for internal hash-table bucketing is not "extra safe," it's wasted CPU on every operation for a property nothing in that use case needs.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** You're picking a hash function to route keys across shards. What actually matters in that choice?
> **Ideal answer:** Uniformity (even key distribution across shards, avoiding hot shards) and speed (it runs on every request), plus avalanche effect so that near-identical keys - like sequential IDs - don't cluster on the same shard. Collision resistance against a deliberate adversary is irrelevant here unless the key space is attacker-controlled.
> **Common trap:** Reaching for a cryptographic hash "to be safe" - it costs real CPU per request for a threat model (adversarial collision) that doesn't exist for internal routing.
> **Next question:** "Your shard load is uneven even though you picked a well-known fast hash function - what do you check first?" → Whether the real key distribution has structure (sequential IDs, shared prefixes, timestamps) that the hash function isn't disguising well - test uniformity against actual production keys, not synthetic random strings.

> 🎯 **Interview Lens**
> **Q:** Two completely different records produce the same hash value in your deduplication system. Is that expected, and what do you do about it?
> **Ideal answer:** Some collision rate is mathematically guaranteed (pigeonhole principle) and its likelihood at your data volume is governed by the birthday bound - roughly `2^(n/2)` items before a 50% chance, for an `n`-bit hash. If collisions are happening at a rate that matters, the fix is a larger output space (move from 64-bit to 128-bit, for instance) or storing enough of the original content to disambiguate on a hash match, not assuming the hash function is broken.
> **Common trap:** Treating any observed collision as proof the hash function is defective, rather than checking whether the observed rate is within the expected birthday-bound probability for the actual item count.
> **Next question:** "How would you decide between a 64-bit and a 128-bit hash for a content-addressable store expecting a billion objects?" → Compute the birthday-bound collision probability at a billion items for each size - 64-bit's ~4-billion 50%-point is uncomfortably close to a billion objects, 128-bit's bound is astronomically further away, so the extra 64 bits of storage cost buys a real, not cosmetic, safety margin.

> 🎯 **Interview Lens**
> **Q:** When would you reach for a cryptographic hash instead of something like MurmurHash or xxHash?
> **Ideal answer:** When an adversary can supply or influence the input and benefits from forcing a specific outcome - password storage, content integrity where tampering must be detectable, digital signatures, or public-facing deduplication where a malicious actor gains something from engineering a collision. The cost is real (cryptographic hashes are meaningfully slower by design), so it's only worth paying where that threat model genuinely exists.
> **Common trap:** Treating "cryptographic" as a strictly-better tier rather than a different trade-off - applying it uniformly regardless of whether the input is adversarial.
> **Next question:** "Your public API lets users upload files, and you dedupe by content hash. Someone reports two different files hashing identically - what does that tell you about your hash choice?" → If using MD5, this is expected and exploitable (MD5 collisions are cheap to construct deliberately); it's a signal to move to a currently-unbroken cryptographic hash (SHA-256), not just a bigger MD5-family output.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| FNV | Fowler-Noll-Vo | A simple, fast non-cryptographic hash family |
| SHA | Secure Hash Algorithm | A family of cryptographic hash functions (SHA-256, SHA-3, etc.) |
| MD5 | Message Digest 5 | A cryptographically broken but still-fast hash, safe only for non-adversarial checksums |
| CRC | Cyclic Redundancy Check | A checksum designed to catch accidental corruption, not adversarial tampering |

### Anti-patterns

- Using a cryptographic hash for internal routing/sharding - wastes CPU for a threat model that doesn't apply; use a fast non-cryptographic hash instead.
- Using MD5 or CRC32 where input is adversarial (untrusted uploads, public-facing dedup) - both are cheap to deliberately collide; use a current cryptographic hash (SHA-256) instead.
- Relying on a language runtime's default/randomized string hash for cross-process distributed routing - it can differ per process; use an explicit, fixed hash function instead.
- Assuming a hash function is uniform without testing against real key distributions - sequential IDs and shared prefixes are common real-world patterns that expose non-uniformity synthetic random-string benchmarks miss.

### Selection Matrix

| Hash Function | Type | Typical Use | Notes |
| --- | --- | --- | --- |
| MurmurHash3 | Non-cryptographic | Partitioning, hash tables | Common default in distributed data stores |
| xxHash | Non-cryptographic | Large-volume dedup, checksumming | Optimized for raw throughput |
| FNV | Non-cryptographic | Small internal hash tables | Simple, weaker distribution under adversarial/structured input |
| CityHash / FarmHash | Non-cryptographic | Short-string keys | FarmHash supersedes CityHash |
| SHA-256 / SHA-3 | Cryptographic | Integrity, signatures, content addressing | Current standard, slower by design |
| MD5 | Cryptographic (broken) | Non-adversarial checksums only | Deliberate collisions are cheap - never use where input is adversarial |
</content>
</invoke>
