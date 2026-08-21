# Load Balancer High Availability

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Must read]
- **[DNS](./dns.md)** [Should read]

---

## Table of Contents

- [Conceptual Foundations & Mental Models](#conceptual-foundations--mental-models)
- [Active-Active vs Active-Passive LB Pairs](#active-active-vs-active-passive-lb-pairs)
- [Floating IPs & VRRP](#floating-ips--vrrp)
- [Split-Brain Prevention](#split-brain-prevention)
- [Cascading Failure Under Backend Loss](#cascading-failure-under-backend-loss)
- [Quick Decision Guide](#quick-decision-guide)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A load balancer eliminates backends as a single point of failure, but the LB itself becomes one unless it's deployed with its own HA strategy. The core mechanism is a floating VIP shared between two or more LB nodes, with VRRP (or a cloud equivalent) transferring ownership on failure detection. The trade-off is active-passive simplicity with a failover gap versus active-active utilization that requires stateless LBs or synchronized connection state. Say it out loud: the LB's own HA isn't optional infrastructure, it's the same single-point-of-failure problem the LB was introduced to solve, just moved up one layer.

---

## Conceptual Foundations & Mental Models

**Interviewer TL;DR:** An LB without HA is itself a SPOF - always deploy in an HA pair with a floating VIP; active-active is preferred but requires stateless LBs.

**Mental model:** The load balancer eliminates the backend as a SPOF, but the LB itself is a SPOF unless made HA. Every LB deployment needs an HA strategy.

---

## Active-Active vs Active-Passive LB Pairs

**Active-Passive:** One LB handles all traffic (primary), the other is on standby. Failover is triggered when the primary fails. Simple but wastes capacity and has a failover window during which new connections fail.

**Active-Active:** Both LBs handle traffic simultaneously, typically via DNS round robin or Anycast. Better utilization. One LB going down reduces capacity rather than causing a full outage.

**Trade-off:** Active-active requires stateless LBs (or synchronized state), which complicates sticky sessions and connection tracking.

| Mode           | Utilization                          | Failover Gap                          | State Complexity                             | Best For                                  |
| -------------- | ------------------------------------- | -------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Active-Passive | Low - standby sits idle               | Seconds (VRRP detection + VIP handoff) | Low - only one node serves traffic at a time    | Simplicity, moderate downtime tolerance     |
| Active-Active  | High - both nodes serve traffic       | None for surviving node's traffic      | High - needs stateless LBs or synced conntrack | High-criticality traffic, stateless LB tier |

**Pick it when:** choose Active-Passive when a few seconds of failover is acceptable and you want the simpler operational model; choose Active-Active when any downtime is unacceptable and you can make the LB tier stateless (or are willing to run connection-state sync).

---

## Floating IPs & VRRP

A **floating IP** (Virtual IP / VIP) is an IP address that can be reassigned between nodes. In Active-Passive HA:

1. Both LBs share a VIP. DNS points to the VIP.
2. Primary "owns" the VIP (responds to ARP for that IP).
3. On primary failure, secondary claims the VIP using VRRP (Virtual Router Redundancy Protocol - a standard that lets two nodes share a virtual IP, with the standby taking ownership automatically when the primary stops responding).

VRRP broadcasts heartbeats. If the primary misses N consecutive heartbeats, the secondary takes over. Failover is typically sub-second once detection completes.

```
Normal operation:

  [Primary LB]  ◀── owns VIP, answers ARP for it
       │
       ├── VRRP heartbeat ──▶ [Secondary LB]  (standby, listening)
       │
  Clients ──▶ VIP ──▶ Primary

Primary fails:

  [Primary LB]  ✕ (crashed / network partition)
       │
       ╳  heartbeat missed × N (default 3 × 1s = 3s)
       │
  [Secondary LB]  detects timeout ──▶ claims VIP, sends gratuitous ARP

After handoff:

  Clients ──▶ VIP ──▶ Secondary  (now owns VIP, answers ARP)
```

**Cloud-native equivalent:** VRRP is an on-prem/bare-metal pattern - cloud providers don't expose L2 networking needed for gratuitous ARP. In AWS, HA is achieved by remapping an Elastic IP to the standby instance via API call on failure detection. In GCP, regional forwarding rules are reassigned. The mechanism differs but the concept is identical: one VIP, two nodes, automatic ownership transfer. Managed LBs (AWS ALB, GCP LB) handle HA internally - you never configure VRRP for them.

---

## Split-Brain Prevention

**<abbr>Split-brain</abbr>:** Both LBs simultaneously believe they are the primary and both claim the VIP. Causes duplicate responses, routing inconsistencies, and state corruption.

Prevention strategies:

- VRRP priority + preemption settings (only one node has higher priority)
- External quorum (a 3rd node breaks ties)
- Network fencing (STONITH - Shoot The Other Node In The Head): the losing node forcibly powers itself off, guaranteeing only one node can own the VIP at a time

---

## Cascading Failure Under Backend Loss

When multiple backends fail simultaneously, remaining backends absorb all traffic. If they're near capacity, they too start failing - a cascade.

Mitigations:

- Circuit breaker at LB: stop sending traffic to backends returning 5xx above a threshold
- Load shedding: return 503 to some clients rather than overloading backends
- Capacity planning: maintain N+2 backend capacity (tolerate losing 2 nodes without cascade)

---

## Quick Decision Guide

```
Traffic criticality?
  ├─ High (any downtime is unacceptable)
  │    └──▶ Active-Active pair + Anycast or DNS LB (→ #active-active-vs-active-passive-lb-pairs)
  │
  └─ Moderate (seconds of failover acceptable)
       └──▶ Active-Passive pair + VRRP Floating VIP (→ #floating-ips--vrrp)
                │
                ▼
              Need in-flight connections to survive failover?
                ├─ YES ──▶ Add conntrack state sync (conntrackd)
                └─ NO  ──▶ Stateless failover is sufficient; ensure clients retry
```

**Real-world usage:** Cloud-managed LBs (AWS ALB/NLB, GCP Cloud Load Balancing) handle HA internally across multiple zones by default; on-prem HAProxy/nginx pairs typically run keepalived for VRRP. At scale, the failure mode that surprises teams isn't the VIP handoff itself - it's that conntrack state isn't synchronized between nodes by default, so "the VIP moved instantly" and "in-flight connections dropped anyway" are both true at once (see [HA Failover Timing Gaps & VIP Handoff Delays](#ha-failover-timing-gaps--vip-handoff-delays)).

---

## Production Failure Modes & Gotchas

**Interviewer TL;DR:** The VIP moving to the standby node is not the same as failover being instant - ARP cache staleness and unsynchronized conntrack state both add real downtime on top of detection time.

### HA Failover Timing Gaps & VIP Handoff Delays

**Scenario:** Primary LB fails. VRRP detects failure and secondary claims the VIP. During the detection + handoff window (typically 1-3 seconds), all new connections fail.

**Contributing factors:**

- VRRP heartbeat interval (default 1s) × failure threshold (default 3 missed = 3s detection time)
- ARP cache on upstream router takes time to update after VIP moves to secondary
- Conntrack state not synchronized between primary and secondary → in-flight connections drop at failover

**Fixes:**

- Tune VRRP to sub-second heartbeats (at the cost of more false positives on transient network blips)
- Send gratuitous ARP (an unsolicited broadcast that tells all network devices "this MAC address now owns this IP" - forces immediate ARP cache refresh across the network) immediately on VIP takeover
- Use conntrackd (a daemon that synchronizes the conntrack table between two nodes in real time) for state sync between LB nodes to preserve in-flight connections
- Design clients to retry on connection failure (most HTTP clients do this automatically)

> **⚠️ Common Traps & How to Recover**
>
> - **Trap:** Assuming "sub-second VRRP" means zero downtime - forgetting that the upstream router's ARP cache still points to the old LB MAC. **Recovery:** Always send a gratuitous ARP on VIP takeover; verify with `arping` from the router.
> - **Trap:** Only testing failover in staging - ARP cache TTLs and network topology differ from production. **Recovery:** Run regular failover drills in production during low-traffic windows.
> - **Trap:** Not synchronizing conntrack state - in-flight TCP connections drop on failover even though the VIP moves cleanly. **Recovery:** Deploy conntrackd for state sync, or design clients to retry on RST (most do).

### Common Misconceptions

- **"Active-Active HA means zero downtime"** - conntrack state isn't automatically synced between nodes; in-flight connections to a failed node still drop and must be retried client-side.
- **"The VIP moving means failover is complete"** - the VIP can move in milliseconds while the upstream router's ARP cache still points at the old MAC address for seconds longer, so client-visible downtime outlasts the VIP handoff itself.

**Key Takeaway:** Failover time is detection time plus ARP propagation plus (if unsynchronized) dropped in-flight connections - not just the VRRP heartbeat math.

---

## Interview Scenario Bank

### Making the LB Itself Highly Available

> 🎯 **Interview Lens**
> **Q:** How do you make a load balancer itself highly available?
> **Ideal answer:** Two LBs sharing a floating VIP - Active-Passive (VRRP on-prem, Elastic IP reassignment on AWS) for simplicity, or Active-Active for better utilization. DNS points to the VIP; clients never see the failover.
> **Common trap:** Designing HA for backends but leaving a single LB in front - always ask "what fails if this component goes down?"
> **Next question:** In active-active HA, how does a sticky-session client always hit the same LB? → either synchronize session state between LB nodes (real complexity), consistent-hash at the DNS/Anycast layer so a client always lands on the same LB, or remove the need entirely by making backends stateless.

### Diagnosing Dropped Connections During a Clean Failover

> 🎯 **Interview Lens**
> **Q:** Your standby load balancer takes over the virtual IP in under a second after the primary fails, yet users still report dropped connections for several seconds afterward - what's the gap?
> **Ideal answer:** The VIP moving is only one part of failover - the upstream router's ARP cache may still point to the old node's MAC address until it's refreshed, and any in-flight connections whose state wasn't synchronized between nodes are dropped regardless of how fast the VIP moved.
> **Common trap:** Concluding the VRRP heartbeat interval is too slow and just tuning it faster - that shortens detection time but does nothing for stale ARP entries or unsynced connection state.
> **Next question:** How would you preserve an in-flight file upload across that failover? → Synchronize connection state between nodes with a tool like conntrackd, and design the client to resume or retry rather than assume the transfer survives silently.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| ------- | --------- | ------------------ |
| VRRP    | Virtual Router Redundancy Protocol | Lets two nodes share a virtual IP with automatic standby takeover |
| VIP     | Virtual IP | An IP address that can be reassigned between nodes |
| STONITH | Shoot The Other Node In The Head | Fencing technique that forcibly powers off a losing node to prevent split-brain |
| ARP     | Address Resolution Protocol | Maps an IP to a MAC address; stale entries delay client-visible failover |

### Anti-Patterns

- **Single LB without HA** - the LB itself becomes the SPOF it was meant to eliminate.
- **Assuming VIP handoff speed equals failover speed** - ignores ARP cache staleness and unsynchronized connection state, both of which add real downtime.
- **Tuning VRRP heartbeats aggressively without addressing ARP or conntrack sync** - shortens detection time while leaving the larger contributors to failover downtime unaddressed.
