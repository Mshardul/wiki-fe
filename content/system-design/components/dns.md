# DNS

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Should read]
- **[Caching](./caching.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Record Types](#record-types)
- [Quick Decision Guide](#quick-decision-guide)
- [DNS as a Load-Balancing and Traffic-Steering Layer](#dns-as-a-load-balancing-and-traffic-steering-layer)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

DNS is a globally distributed, hierarchical, eventually-consistent key-value lookup that maps names to IP addresses, cached aggressively at every layer via TTLs. The core interview insight isn't "how resolution works" - it's that DNS is often the *first* traffic-steering and failover tool a system reaches for (geo-routing, weighted rollouts, failover) precisely because it sits in front of everything else, and its biggest risk is that TTL-driven caching makes it slow to react to change.

## Core Mechanics

A DNS lookup resolves in stages, each with its own cache:

1. **Browser/OS cache** - checked first, honors the record's TTL.
2. **Recursive resolver** (ISP or public: `8.8.8.8`, `1.1.1.1`) - does the actual walk if not cached, then caches the result for its clients.
3. **Root nameserver** - knows only which TLD server to ask (`.com`, `.org`, …).
4. **TLD nameserver** - knows which authoritative nameserver owns the specific domain.
5. **Authoritative nameserver** - holds the actual records for `my-service.example.com` and returns the answer.

```
Client → Recursive Resolver → Root NS → TLD NS → Authoritative NS
              ↑                                        |
              └──────────── cached answer ──────────────┘
```

Each hop's answer is cached for the record's **TTL** (Time To Live, in seconds). A short TTL means faster propagation of changes but more resolver load and slower average lookups (cache misses more often); a long TTL means cheap, fast lookups but slow failover and slow rollout of change.

> ⚖️ **Decision Framework**
> Short TTL (30-60s): use when you need fast failover or frequent IP changes (blue-green cutover, canary). Cost: higher query volume on authoritative nameservers, slightly higher average latency (more cache misses).
> Long TTL (1hr-1day+): use for stable infrastructure (a company's root domain, MX records). Cost: a bad record change or a dead IP stays live in caches for the full TTL - client-side pain until it expires.

## Record Types

| Record | Purpose | Example |
| --- | --- | --- |
| `A` | Hostname → IPv4 address | `api.example.com → 203.0.113.5` |
| `AAAA` | Hostname → IPv6 address | `api.example.com → 2001:db8::1` |
| `CNAME` | Alias → another hostname (not an IP) | `www.example.com → example.com` |
| `MX` | Mail routing, with priority | `example.com → mail.example.com (priority 10)` |
| `TXT` | Arbitrary text - domain verification, SPF/DKIM | `example.com → "v=spf1 include:_spf.example.com ~all"` |
| `NS` | Delegates a zone to a set of nameservers | `example.com → ns1.example.com` |
| `SRV` | Service location (host + port) for a named service | `_sip._tcp.example.com → 5 0 5060 sipserver.example.com` |

> ⚠️ **Gotcha**
> `CNAME` cannot coexist with any other record type at the same name (RFC restriction) - this is why a domain apex (`example.com`, no subdomain) usually can't use a CNAME even to point at a CDN, forcing providers to invent workarounds (`ALIAS`/`ANAME` records, or apex-flattening at the DNS provider).

## Quick Decision Guide

- **Need active health-check-based failover in seconds, not minutes** - DNS alone is too slow (TTL + resolver caching lag); put a load balancer or global traffic manager in front and keep DNS TTLs short only as a secondary lever.
- **Need to route users to the nearest region** - GeoDNS / latency-based routing at the DNS layer, resolved once per client-resolver cache window, not per-request.
- **Need per-request routing decisions (path, header, cookie-based)** - DNS can't see any of that; it only resolves a name to an IP before the request is even made. That's an L7 load balancer's job (see [Load Balancer](./load-balancer.md)).
- **Rolling out a new IP for existing infra** - lower the TTL *ahead of time* (e.g. a day before the change), let the low TTL propagate, then make the change, then raise the TTL back once stable.

## DNS as a Load-Balancing and Traffic-Steering Layer

Beyond plain name resolution, authoritative DNS providers commonly layer routing policies on top of records:

- **Round-robin DNS** - multiple `A` records for one name; resolvers return them in rotating order. Crude load distribution - no health awareness, and OS/browser resolvers may cache and reuse just the first IP for far longer than intended.
- **Weighted routing** - split traffic by percentage across multiple targets (e.g. 95%/5% for a canary release).
- **Latency-based / GeoDNS routing** - return the IP of the region closest to (or with lowest latency to) the resolver's location, approximating the client's location.
- **Failover routing** - health-checked records; if the primary target fails its health check, DNS starts returning the secondary target's IP for new lookups. Still bound by TTL - already-cached clients don't see the failover until their cache expires.

> 🧠 **Thought Process**
> A candidate asked to design failover often reaches for "just update DNS." The senior answer names the actual bound: failover-via-DNS is capped by the *slowest* cache in the chain, which is not the DNS provider's TTL - it's whatever the client's OS/browser/resolver decided to (mis)cache regardless of TTL. That's why production failover systems put an L4/L7 load balancer or anycast IP in the critical path and treat DNS failover as a slower, secondary layer.

## Resilience & Failure Handling

- **Anycast** - authoritative and public resolver nameservers (like `1.1.1.1`) are typically announced from many physical locations sharing one IP; BGP routes each client to the topologically nearest one. This is why public resolvers are fast and resilient without client-side configuration.
- **Redundant authoritative nameservers** - a zone's `NS` records point to multiple independent nameservers (often across two providers, "secondary DNS") so a single provider outage doesn't take resolution down entirely.
- **Negative caching** - failed lookups (`NXDOMAIN`) are also cached, per the zone's `SOA` record TTL, to prevent hammering authoritative servers with repeated lookups for a typo'd or not-yet-created name.

## Production Failure Modes & Gotchas

- **TTL-driven stale routing** - a changed or dead record stays resolvable from caches for up to its full TTL; this is the single most common "why is 5% of traffic still hitting the old server" incident.
- **DNS propagation delay misconceptions** - "propagation" isn't a push - it's caches expiring and re-fetching independently, at different times, based on when each cache last fetched. Two clients can see different answers for the same name simultaneously, both correctly honoring their own cache state.
- **DNS as a single point of failure** - a misconfigured or deleted record, or an outage at the authoritative provider (e.g. a major provider-wide incident), can take down every service depending on that zone at once, regardless of how resilient the services themselves are.
- **Resolver-level over-caching** - some OS/browser resolvers ignore or extend TTLs beyond what's specified, especially on mobile networks with aggressive carrier-level DNS caching - a documented TTL is a hint, not a hard guarantee across every hop.
- **DNS amplification abuse** - small DNS queries can trigger large responses (especially with `ANY` queries or DNSSEC records); attackers spoof the victim's IP as the query source to reflect amplified traffic at them (a DDoS vector, relevant when reasoning about exposing an open resolver).

### Common Misconceptions

- "Changing DNS updates instantly" - no, it updates only as fast as the slowest cache in the path honors its TTL; there is no push mechanism to already-cached clients.
- "A lower TTL fixes failover speed" - it lowers the *ceiling*, but non-compliant resolver caching, application-level connection pooling, and OS-level caching can all still hold an old IP longer than the TTL states.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** How would you implement failover between two regions if the primary goes down?
> **Ideal answer:** DNS failover (health-checked records, short TTL) as one layer, but call out its floor: it's bound by client-side cache compliance, so for sub-second failover you need an L4/anycast layer or a load balancer with active health checks in front, and treat DNS as the slower secondary mechanism, not the primary one.
> **Common trap:** Saying "just lower the DNS TTL and add a health check" as if that alone gives fast, reliable failover.
> **Next question:** A customer says they were still hitting the dead region 20 minutes after failover triggered - how do you explain and debug that?

> 🎯 **Interview Lens**
> **Q:** Why can't you put a CNAME on the domain apex (`example.com` with no subdomain)?
> **Ideal answer:** RFC restriction - a name with a CNAME can have no other records at that name, but the apex must also carry `NS`/`SOA`/often `MX` records, which conflicts. Providers work around it with apex-flattening (`ALIAS`/`ANAME`) that resolves the CNAME target server-side and serves an `A` record.
> **Common trap:** Not knowing the restriction exists and proposing a plain CNAME at the apex, which most registrars will reject.
> **Next question:** How does apex-flattening interact with TTL behavior compared to a normal CNAME chain?

> 🎯 **Interview Lens**
> **Q:** Two users hit `example.com` at the same moment and get routed to different regions. Is that a bug?
> **Ideal answer:** Not necessarily - if GeoDNS/latency-based routing is in play, different resolver locations legitimately get different answers; if it's plain round-robin or a recent record change mid-propagation, differing answers are expected because each client's cache expired and re-fetched at a different time.
> **Common trap:** Assuming any inconsistency between two clients means something is broken, rather than checking whether it's explained by routing policy or normal cache-expiry skew.
> **Next question:** How would you distinguish "expected policy-driven variance" from "an actual propagation bug" in production?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TTL | Time To Live | Seconds a DNS answer may be cached before re-querying is required |
| TLD | Top-Level Domain | The rightmost label of a domain (`.com`, `.org`) |
| SOA | Start of Authority | Zone record holding negative-caching TTL and zone metadata |
| NXDOMAIN | Non-Existent Domain | Response code meaning the queried name does not exist |

### Anti-patterns

- Relying on DNS TTL alone for sub-second failover - it fails to account for non-compliant resolver caching; pair with an L4/L7 load balancer or anycast IP for fast failover.
- Leaving TTLs high on infrastructure expected to change soon - raises the blast radius and duration of any bad record push; lower TTL proactively before a planned migration.
- Treating "propagation" as a single global event - it's independent per-cache expiry; design rollouts assuming a window of mixed old/new traffic, not an instant cutover.
