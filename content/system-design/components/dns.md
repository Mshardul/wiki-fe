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

DNS is a globally distributed, hierarchical, eventually-consistent lookup mapping names to IPs, cached aggressively via TTLs. The real interview insight: it's often the *first* traffic-steering and failover tool reached for, since it fronts everything else - but TTL caching makes it slow to react to change.

## Core Mechanics

A DNS lookup resolves in stages, each with its own cache:

1. **Browser/OS cache** - checked first, honors the record's TTL.
2. **Recursive resolver** (ISP or public: `8.8.8.8` Google Public DNS, `1.1.1.1` Cloudflare DNS) - does the actual walk if not cached, then caches the result for its clients.
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

### Split-Horizon (Internal vs External) DNS

The same zone name can resolve differently depending on who's asking. A resolver inside a company's VPC/private network answers `my-service.example.com` with a private `10.0.0.0/16` address, while the same name queried from the public internet gets a public IP (or nothing at all) - two authoritative answer sets for one name, selected by the resolver's network location rather than by anything in the query itself. This is standard for internal service discovery: internal load balancers, databases, and admin endpoints get names that are simply unresolvable (or resolve to nothing routable) outside the private network, which is a cheap first layer of access control on top of whatever firewall/security-group rules also apply.

> ⚠️ **Gotcha**
> Split-horizon setups are a common source of "works on my machine" DNS bugs - a service that resolves fine from a VPN-connected laptop or an in-VPC host silently fails to resolve (or resolves to the wrong IP) from CI runners, third-party integrations, or anyone outside the private view, because they're hitting the external zone, not the internal one.

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

| Need | Choice | Caveat |
| --- | --- | --- |
| Health-check-based failover in seconds, not minutes | Load balancer or global traffic manager in front; DNS TTL is a secondary lever only | DNS alone is too slow - TTL + resolver caching lag |
| Route users to the nearest region | GeoDNS / latency-based routing at the DNS layer | Resolved once per client-resolver cache window, not per-request |
| Per-request routing (path, header, cookie-based) | L7 load balancer (see [Load Balancer](./load-balancer.md)) | DNS can't see any of that - it resolves a name to an IP before the request is even made |
| Rolling out a new IP for existing infra | Lower the TTL ahead of time, let it propagate, make the change, then raise TTL back | e.g. a day's lead time before the change |

Managed authoritative DNS (Route 53, Cloudflare DNS, NS1) is the workhorse choice for production zones rather than self-hosting nameservers, since it bundles anycast, health-checked routing, and DDoS-hardened infrastructure that's expensive to replicate. At scale, the failure mode that only shows up past a real threshold is query-volume-driven: a zone popular enough to draw millions of queries per second (or one degraded by amplification abuse targeting it) can exceed even a managed provider's per-zone rate limits or trigger provider-side throttling, which looks identical to an outage to every client depending on that zone - the fix is spreading authoritative service across two independent providers ("secondary DNS", see [Resilience & Failure Handling](#resilience--failure-handling)) so no single provider's capacity ceiling is a single point of failure.

## DNS as a Load-Balancing and Traffic-Steering Layer

Beyond plain name resolution, authoritative DNS providers commonly layer routing policies on top of records:

- **Round-robin DNS** - multiple `A` records for one name; resolvers return them in rotating order. Crude load distribution - no health awareness, and OS/browser resolvers may cache and reuse just the first IP for far longer than intended (this sticky-IP behavior is one of the traffic-skew failure modes tracked in [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)).
- **Weighted routing** - split traffic by percentage across multiple targets (e.g. 95%/5% for a canary release).
- **Latency-based / GeoDNS routing** - return the IP of the region closest to (or with lowest latency to) the resolver's location, approximating the client's location.
- **Failover routing** - health-checked records; if the primary target fails its health check, DNS starts returning the secondary target's IP for new lookups. Still bound by TTL - already-cached clients don't see the failover until their cache expires.

> 🧠 **Thought Process**
> A candidate asked to design failover often reaches for "just update DNS." The senior answer names the actual bound: failover-via-DNS is capped by the *slowest* cache in the chain, which is not the DNS provider's TTL - it's whatever the client's OS/browser/resolver decided to (mis)cache regardless of TTL. That's why production failover systems put an L4/L7 load balancer or anycast IP in the critical path and treat DNS failover as a slower, secondary layer.

## Resilience & Failure Handling

- **Anycast** - authoritative and public resolver nameservers (like `1.1.1.1`) are typically announced from many physical locations sharing one IP; BGP routes each client to the topologically nearest one. This is why public resolvers are fast and resilient without client-side configuration.
- **Redundant authoritative nameservers** - a zone's `NS` records point to multiple independent nameservers (often across two providers, "secondary DNS") so a single provider outage doesn't take resolution down entirely.
- **Negative caching** - failed lookups (`NXDOMAIN`) are also cached, per the zone's `SOA` record TTL, to prevent hammering authoritative servers with repeated lookups for a typo'd or not-yet-created name.
- **Open-resolver hardening** - an authoritative or recursive resolver that answers queries from any source IP is exploitable as a reflection amplifier (see [DNS amplification abuse](#production-failure-modes--gotchas)): small forged-source queries trigger disproportionately large responses back at a spoofed victim. Resilience here means restricting who can query the resolver (ACLs, rate limiting per source) rather than treating it purely as a network-layer DDoS problem.

### Cache Poisoning & DNSSEC

Plain DNS has no way to verify that a response actually came from the authoritative nameserver it claims to - a resolver accepts whichever answer arrives first with a matching query ID, so an attacker who can guess or race that ID can inject a forged record into a resolver's cache (cache poisoning). Once poisoned, every client using that resolver gets routed to the attacker's IP until the forged entry's TTL expires - no compromise of the client or the real server required.

**DNSSEC (DNS Security Extensions)** closes this by signing zone data with public-key cryptography instead of trusting whoever answers first:

- Each zone signs its records with a private key, publishing `RRSIG` (signature), `DNSKEY` (public key), and `DS` (delegation signer - links a child zone's key to its parent's signature) records alongside the normal ones.
- A validating resolver checks the signature chain from the root zone down through each delegation to the answer, so a forged response fails signature verification and is discarded even if it wins the race on query ID.
- The trust chain mirrors the delegation hierarchy itself (root → TLD → authoritative), so validation requires no out-of-band key exchange - the chain of custody is the DNS hierarchy.

> ⚠️ **Gotcha**
> DNSSEC authenticates and integrity-checks records - it does **not** encrypt the query or response (that's DoH/DoT's job, a transport-layer concern, not DNSSEC's - see below). A DNSSEC-signed lookup is still fully visible on the wire; it's tamper-evident, not confidential.

> ⚖️ **Decision Framework**
> Enable DNSSEC when the domain is a plausible spoofing/poisoning target (anything handling auth, payments, or high-traffic brand domains) - cost is mostly operational: key rotation discipline and larger UDP responses (signatures roughly double record size, pushing some responses past the traditional 512-byte UDP limit and forcing EDNS0 or TCP fallback). Skip or defer it for low-value internal zones where the operational overhead isn't worth the marginal risk reduction, and be aware a misconfigured key rotation is itself a common source of a zone going dark (validating resolvers reject an unsigned or wrongly-signed answer instead of falling back to insecure lookup).

### DoH/DoT - Encrypting the Query Itself

DNSSEC leaves the query and response fully visible on the wire - anyone on the network path (an ISP, a coffee-shop Wi-Fi operator, an on-path attacker) can see every name being looked up, and can also inject or tamper with unsigned responses. **DNS-over-HTTPS (DoH)** and **DNS-over-TLS (DoT)** close that gap by wrapping the DNS query/response in TLS: DoH tunnels it inside HTTPS (indistinguishable from normal web traffic, port 443), DoT runs it as its own encrypted TLS stream (port 853, more easily identified and blocked by a network operator that wants to). Both stop network-level eavesdropping and tampering of the query itself; neither replaces DNSSEC's job of verifying the *authoritative* answer is genuine, and neither replaces a CDN/TLS certificate's job of authenticating the server the client eventually connects to.

> ⚖️ **Decision Framework**
> DoH/DoT matter most for client-side privacy (browsers, mobile OSes) where the resolver hop crosses a network you don't trust - a public Wi-Fi network, a middlebox-heavy corporate proxy, an ISP that sells query logs. Inside a system-design context, the relevant trade-off is that a network operator who relies on inspecting or filtering plaintext DNS (parental controls, corporate egress policy, malware-domain blocklists) loses that visibility once clients default to DoH - which is why some enterprise networks explicitly block or intercept DoH/DoT rather than let clients bypass the internal resolver.

## Production Failure Modes & Gotchas

### TTL and Propagation Failures

- **TTL-driven stale routing** - a changed or dead record stays resolvable from caches for up to its full TTL; this is the single most common "why is 5% of traffic still hitting the old server" incident.
- **DNS propagation delay misconceptions** - "propagation" isn't a push - it's caches expiring and re-fetching independently, at different times, based on when each cache last fetched. Two clients can see different answers for the same name simultaneously, both correctly honoring their own cache state.
- **Resolver-level over-caching** - some OS/browser resolvers ignore or extend TTLs beyond what's specified, especially on mobile networks with aggressive carrier-level DNS caching - a documented TTL is a hint, not a hard guarantee across every hop.
- **Round-robin/GeoDNS traffic skew** - round-robin's lack of health awareness plus resolver-level over-caching (above) means a "balanced" rotation can end up sending a disproportionate share of clients to one backend for far longer than the TTL suggests; GeoDNS has the mirror problem, where a resolver's location doesn't match its clients' real location (a large corporate or mobile-carrier resolver serving users across a wide geography), so "nearest to the resolver" silently stops meaning "nearest to the client" - see [DNS as a Load-Balancing and Traffic-Steering Layer](#dns-as-a-load-balancing-and-traffic-steering-layer).

### Availability and Security Failures

- **DNS as a single point of failure** - a misconfigured or deleted record, or an outage at the authoritative provider (e.g. a major provider-wide incident), can take down every service depending on that zone at once, regardless of how resilient the services themselves are.
- **DNS amplification abuse** - small DNS queries can trigger large responses (especially with `ANY` queries or DNSSEC records); attackers spoof the victim's IP as the query source to reflect amplified traffic at them (a DDoS vector - see [Open-resolver hardening](#resilience--failure-handling) for the mitigation).
- **Cache poisoning without DNSSEC** - see [Cache Poisoning & DNSSEC](#cache-poisoning--dnssec); an unsigned zone has no way for a resolver to detect a forged response, so a successful race on the query ID silently redirects every client behind that resolver.

### Common Misconceptions

- "Changing DNS updates instantly" - no, it updates only as fast as the slowest cache in the path honors its TTL; there is no push mechanism to already-cached clients.
- "A lower TTL fixes failover speed" - it lowers the *ceiling*, but non-compliant resolver caching, application-level connection pooling, and OS-level caching can all still hold an old IP longer than the TTL states.
- "DNSSEC encrypts DNS traffic" - no, it only authenticates that a response came from the real zone owner and wasn't tampered with; the query and answer remain plaintext on the wire.

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

> 🎯 **Interview Lens**
> **Q:** An attacker manages to inject a forged record into a resolver's cache, redirecting some users to a malicious IP for a domain they never touched. How is this possible, and what's the fix?
> **Ideal answer:** Plain DNS trusts whichever response arrives first with a matching query ID, so a resolver has no way to verify the response actually came from the real authoritative nameserver - an attacker who wins that race can plant a forged answer that stays cached for the record's TTL. The fix is a signature chain from the zone owner down through each delegation, verified by the resolver before it accepts an answer, so a forged response fails verification and gets discarded regardless of whether it won the race.
> **Common trap:** Assuming HTTPS/TLS on the destination server is enough protection - it's not, because the attack happens before the client ever connects to anything; the client is sent to the attacker's IP in the first place, and a same-domain-mismatched cert would need the user to notice a warning.
> **Next question:** This signing chain only protects the query/response integrity - what does it *not* protect against, and what closes that other gap?

> 🎯 **Interview Lens**
> **Q:** A microservice resolves fine for every engineer connected to the VPN and every host inside the VPC, but fails to resolve (or resolves to a dead IP) for an external CI runner and a third-party integration partner. What's going on, and what's your fix if the partner legitimately needs access?
> **Ideal answer:** The name is answered differently depending on where the query originates - internal callers get a private-network answer that's meaningless (or unroutable) from outside, which is normal and often intentional as a cheap access-control layer. If the partner needs real access, the fix isn't to "make DNS work everywhere" - it's to either publish a separate externally-resolvable record for that use case or front the service with something actually reachable (a public load balancer, an API gateway) and keep the internal-only name for internal callers.
> **Common trap:** Treating it as a generic DNS propagation bug and just waiting/retrying, instead of recognizing that two different, correctly-functioning answer sets exist for the same name by design.
> **Next question:** Separately - your team wants query privacy so an on-path network operator (public Wi-Fi, a nosy ISP) can't see which internal hostnames are being looked up. Encrypting the transport stops the eavesdropping, but what does it *not* protect against, and why would a corporate network operator sometimes want to block that encrypted path entirely?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TTL | Time To Live | Seconds a DNS answer may be cached before re-querying is required |
| TLD | Top-Level Domain | The rightmost label of a domain (`.com`, `.org`) |
| SOA | Start of Authority | Zone record holding negative-caching TTL and zone metadata |
| NXDOMAIN | Non-Existent Domain | Response code meaning the queried name does not exist |
| DNSSEC | DNS Security Extensions | Cryptographic signing of zone records so resolvers can verify a response wasn't forged |
| RRSIG | Resource Record Signature | The DNSSEC signature record over a set of records |
| DS | Delegation Signer | Links a child zone's DNSSEC key to its parent zone's signature, forming the trust chain |
| DoH | DNS-over-HTTPS | Encrypts DNS queries/responses inside HTTPS traffic |
| DoT | DNS-over-TLS | Encrypts DNS queries/responses over a dedicated TLS stream |

### Anti-patterns

- Relying on DNS TTL alone for sub-second failover - it fails to account for non-compliant resolver caching; pair with an L4/L7 load balancer or anycast IP for fast failover.
- Leaving TTLs high on infrastructure expected to change soon - raises the blast radius and duration of any bad record push; lower TTL proactively before a planned migration.
- Treating "propagation" as a single global event - it's independent per-cache expiry; design rollouts assuming a window of mixed old/new traffic, not an instant cutover.
