# HLD Interview Framework

A question-agnostic method for answering any high-level system design question in a tech lead interview. It describes how to proceed and what to say at each stage. It contains no specific system design; worked answers live in their own files, one per question.

---

## 1. The sequence at a glance

Every question runs through the same seven steps, in this order.

| # | Step | Interview time | What you leave the step with |
|---|---|---|---|
| 1 | Scope and requirements | ~5 min | A contract: what is in, what is out, and numeric non-functional targets |
| 2 | Scale estimates | 3-5 min | A handful of numbers, each ending in a design conclusion |
| 3 | API and data model | ~5 min | Endpoints, access patterns, schema, database, partition key |
| 4 | High-level architecture | 8-10 min | A diagram, plus one read and one write traced through it |
| 5 | Deep dives | 10-15 min | The two or three hard problems of this system, reasoned through |
| 6 | Bottlenecks, failure modes, trade-offs | ~5 min | A stress-tested design and an explicit list of what was given up |
| 7 | Tech lead layer | 3-5 min | Phasing, cost, observability, and pushback on requirements |

Steps 4 and 5 are where most of the round goes. Steps 1 to 3 exist to make them defensible. Steps 6 and 7 are what separate a tech lead answer from a senior engineer answer.

---

## 2. Rules that apply to every step

### 2.1 The anatomy of a decision

Every real design decision is presented the same way:

- **Decision:** what you chose.
- **Why:** how it follows from a requirement or a number you already established.
- **How:** how it works under the hood, at the depth an interviewer would probe.
- **Alternatives:** what else you considered, and when each alternative would be the better pick.
- **Pros:** what the choice buys.
- **Cons:** what it costs later.

This applies to decisions (choice of store, partition key, cache strategy, sync vs async, consistency level, protocol details), not to every sentence.

The phrase "it is the better pick when..." is the most useful one in the framework. It shows you know the alternative is valid under different conditions, which is what distinguishes judgment from memorisation.

### 2.2 Propose, don't interrogate

State assumptions and ask for confirmation. Do not fire off a list of open questions. "I'm assuming X, Y, and Z; does that match what you have in mind?" keeps you in control of the round and still gives the interviewer room to redirect.

### 2.3 Everything traces back to the contract

Step 1 produces a contract. Every later choice is justified against it. If you cannot point to the requirement or number behind a component, the component should not be in the design.

### 2.4 Defer deliberately

When you reach the hardest part of the system early, name it and postpone it: "This is the interesting part, and I'll come back to it." That tells the interviewer you know where the difficulty is and are sequencing on purpose.

### 2.5 Simple first, justified complexity second

Start with the smallest design that meets the contract. Add complexity only when a requirement or number forces it. Be willing to remove a component from your own diagram when your numbers show it is unnecessary; doing so, with a reason, is a strong signal.

---

## 3. Step 1: Scope and requirements

**Interview time:** about 5 minutes.

### Purpose

The prompt is deliberately vague. This step turns it into a contract that you and the interviewer agree on. For a tech lead, the signal is that you drive the scoping instead of waiting to be told.

### How to tackle it

1. **State the core functional requirements.** Usually two to four capabilities.
2. **State what is explicitly out of scope, out loud.** Otherwise the interviewer cannot tell whether you excluded something or forgot it.
3. **Raise only the questions that change the design.** The test for each candidate question: which component or decision would differ depending on the answer? If none, drop the question.
4. **State non-functional requirements with a number or a consequence attached.** Words like "scalable" and "reliable" on their own say nothing.

### Question types that usually change a design

- **Identity:** does the same input always produce the same result, or a new one each time? This decides whether writes need a lookup first.
- **Mutability:** can a record change after creation? Immutable data makes caching almost free; mutable data requires invalidation at every cache layer.
- **Exposure:** must identifiers be hard to guess or enumerate? This constrains how identifiers are generated.
- **Product features with hidden technical weight:** some features look like product questions but change a protocol detail or a traffic number. Raise them even when you scope them out, and say where they would plug in.

### Non-functional requirements to cover

State each one together with its design consequence, because the consequence is the part interviewers listen for.

- **Read/write ratio.** Decides which path gets the optimisation effort.
- **Availability target, per path.** Say why the number is what it is, and what it forces (for example, no single point of failure on that path).
- **Latency target, at a percentile.** Say what it forces (for example, most requests served from memory or the edge).
- **Durability.** Say what loss would mean, and what it forces (replicated storage, acknowledged writes).
- **Consistency, split by path.** Identify the one place where strict correctness is non-negotiable, and say that everywhere else can be eventually consistent. Splitting consistency by path is a strong signal; picking "AP" or "CP" for the whole system is the weak answer.

### What to say (template)

> "Let me confirm scope. Core features are [A] and [B], plus [optional C]. I'll leave out [X, Y, Z], but I'll note where [X] would plug in. I'm assuming [assumption 1], [assumption 2], and [assumption 3]. On the non-functional side: this is [read/write]-heavy at roughly [ratio]; [path] needs [availability] and [latency at percentile]; data must [durability]. [The one strict guarantee] has to be strictly correct; everything else can be eventually consistent. Does that match what you have in mind?"

That takes about a minute. The remaining minutes go to whatever the interviewer pushes back on.

### Mistakes to avoid

- Asking questions whose answers change nothing.
- Listing features without saying what is out of scope.
- Stating non-functional requirements as adjectives with no number or consequence.
- Spending ten minutes here. The contract only needs to be good enough to design against, and you can revise it later.

---

## 4. Step 2: Scale estimates

**Interview time:** 3 to 5 minutes.

### Purpose

Estimates exist to answer four design questions:

1. Can one database handle the writes?
2. Can it handle the reads?
3. Does the data fit on one machine?
4. Does the hot data fit in memory?

Every number you compute should end in one of those conclusions. A number that changes no decision is wasted time.

### How to tackle it

1. **Pick one anchor assumption** and derive everything from it.
   - Start from the natural unit of the system. If the system is defined by objects created, anchor on writes per month. If behaviour per user drives load, anchor on daily active users and actions per user.
   - State the anchor as an assumption and ask the interviewer to confirm.
2. **Round hard.** Useful shortcuts: a day is about 100,000 seconds (86,400); a month is about 2.5 million seconds.
3. **Compute, then conclude.** Every number is followed by "so therefore".
4. **Apply a peak factor and justify it.** A 10x factor is reasonable when a single item can go viral or traffic is bursty.

### The standard calculations

- **Write throughput:** volume ÷ seconds, then peak. Conclusion: does write volume need a scaling architecture, or is the write path only about availability and correctness?
- **Read throughput:** writes × read ratio, then peak. Conclusion: is a cache and more than one read source required?
- **Storage:** records × retention × bytes per record (including index overhead), then × replication. Conclusion: must the data be partitioned, and is storage cost a concern at all?
- **Hot set size:** daily requests × the share that is hot × bytes per record. Conclusion: does the hot data fit in memory, making "serve most reads from RAM" realistic?
- **One system-specific number:** most systems have one extra quantity that drives a core design choice (an identifier space, a fan-out count, a connection count, a file size). Compute it here.

### What to skip

If a number constrains nothing, say so and skip it: "Bandwidth is negligible here, so I'll skip it." Skipping a number for a stated reason shows more judgment than computing it.

### What to say (template)

> "Assuming [anchor]: that's about [N] writes a second, [N] at peak, so writes are [easy / the hard part]. Reads at [ratio] are [N] a second, [N] at peak, so [conclusion]. Over [retention] that's [N] records at about [size], so [total], which means [partitioning conclusion]. The hot set is around [size], so it [fits / doesn't fit] in memory. And [system-specific number], which means [conclusion]."

### Mistakes to avoid

- Calculating without concluding. A number with no "so therefore" earns nothing.
- False precision. "About 40" is correct; "38.58" wastes time.
- Estimating everything on a checklist regardless of whether it matters for this system.

---

## 5. Step 3: API and data model

**Interview time:** about 5 minutes.

### Purpose

The API pins down what the system promises to callers. The data model pins down what you store and how you fetch it.

### How to tackle it

The order of reasoning matters:

1. **Define the minimal API.** Only the endpoints the in-scope features need.
2. **List the access patterns.** What is read, by which key, how often; what is written, with which guarantee.
3. **Design the schema** for the in-scope features only.
4. **Choose the database from the access patterns, data size, and required guarantee.**
5. **Choose the partition key.**

Naming a database before the access patterns is the most common mistake in this step.

### API

- Give request shape, response shape, and error codes. Mentioning errors takes five seconds and shows you think about the unhappy path.
- Protocol details can be design decisions. A status code, a cache header, or an idempotency key can change traffic volume or correctness. When a product requirement determines a protocol detail which in turn determines a capacity number, narrate that chain.

### Access patterns

Classify the workload from the patterns:

- Point lookups by a single key, with no joins, range scans, or multi-row transactions, mean a key-value workload.
- Joins, ad-hoc queries, or multi-row transactions mean a relational workload.

That classification, combined with the data size from step 2, drives the database choice.

### Choosing the database

Name a real technology and state the property that earns the pick, so an equivalent can be swapped in.

- **Partitioned key-value or wide-column stores** earn the pick when data must be partitioned and access is by key. Check that the store offers the guarantee your strict path needs (for example, a conditional write for uniqueness).
- **Relational databases** are the better pick when the dataset is small enough for one node (roughly under a terabyte), or when the product needs relational features. Above that size you take on sharding, failover, and rebalancing yourself, or adopt a sharding layer.

### Choosing the partition key

- The partition key must be something the dominant request carries, so the request can locate its partition without help.
- It must spread data evenly.
- An alternative key (for example, partitioning by owner) is the better pick when the dominant query is "list everything belonging to X".
- Name the downside of your key (typically hot keys) and say which later step handles it.

### Enforcing time-based rules

When records expire or change state by time, check the condition on read, and use background deletion only for cleanup. Built-in TTL features are usually lazy, so relying on them alone leaves stale records live.

### What to say (template)

> "[N] endpoints: [list]. I'll use [protocol detail] because [requirement]. The access pattern is [pattern], so this is a [key-value / relational] workload. One table keyed and partitioned on [key]. I'd use [technology] for [property]; [alternative] would work at [condition]. [The hard part] is the interesting piece, and I'll come back to it."

### Mistakes to avoid

- Modelling tables for features you scoped out.
- Picking the database by familiarity, with no reference to access patterns or data size.
- Solving the hard part here. It needs the architecture in place first.

---

## 6. Step 4: High-level architecture

**Interview time:** 8 to 10 minutes.

### Purpose

Draw the smallest set of components that satisfies the contract, then show that it works by tracing requests through it.

### How to tackle it

1. **Draw the boxes.** Every box must trace back to a requirement or a number. The interviewer should be able to point at any box and hear why it exists.
2. **Trace one read and one write** through the diagram, step by step. Describing components without tracing a request is not enough.
3. **State the decision behind each non-obvious component** using the decision anatomy.
4. **Leave the hard part as a named box** and say you will dig into it next.

### Decisions that recur here

- **One service or several.** Split when paths have different loads and different promises, so a bad deploy or spike on one cannot take down the other. One service is the better pick for an MVP or a small team, provided the boundary is clean enough to split later.
- **Stateless services.** State lives in stores, so instances scale horizontally and can die without loss.
- **Cache strategy.** Cache-aside (populate on read miss) suits an availability-first read path, because a cache failure degrades to the database instead of failing the request. Write-through (populate at write time) is the better pick when nearly every write is read soon after.
- **Protecting the database from misses.** Requests for keys that do not exist bypass a positive-only cache. Cache negative results briefly, or use a membership filter when such traffic is heavy.
- **Edge caching.** A CDN absorbs spikes and lowers global latency, at the cost of delayed freshness and reduced visibility into each request.

### What to say (template)

> "Clients hit [edge], then [load balancer], which routes to [services]. [Read path] goes through [cache] and falls back to [store]. [Write path] goes to [service], which [does X] and writes to [store]. I've [split / combined] the services because [reason tied to requirements]. [Hard part] is the box I'd like to dig into next."

Then walk one read and one write through the diagram.

### Mistakes to avoid

- Drawing boxes you cannot justify.
- Describing components without tracing a request through them.
- Solving the hard part in the middle of the overview and losing the thread.

---

## 7. Step 5: Deep dives

**Interview time:** 10 to 15 minutes.

### Purpose

The architecture is roughly the same for every candidate. The deep dives show whether you can find the hard problems and reason through them.

### How to tackle it

1. **Choose two or three parts that are specific to this system.** Not generic infrastructure.
2. **Name them and let the interviewer pick the order:** "There are three areas worth going deeper on: A, B, and C. Which would you like first?"
3. **Run each one in the same four-part shape:**
   - State the problem, restating the constraints it must satisfy.
   - Lay out the options, with how each works and its pros and cons. Keep each alternative to a line or two and say when it would win; the chosen option gets the full decision anatomy. An obviously unsuitable option can be dismissed in one sentence.
   - Pick one, with the reason tied to your own requirements and numbers.
   - Say when you would pick differently.

### Principles

- **The comparison is the content.** Presenting one option as if no others exist loses the point of the step.
- **Let your numbers overrule the textbook.** If your estimates show a simpler option is enough, choose it and be ready to explain why the standard answer was unnecessary here.
- **Prefer solutions that reuse what already exists** over ones that add components.
- **Layer cheap defences first.** When several mitigations apply, order them by cost and say what each layer leaves for the next.

### Problem families that recur across systems

- **Generating identifiers:** uniqueness, length, ordering, guessability, and whether a coordinator is needed.
- **Hot keys and stampedes:** one key taking disproportionate traffic, and many concurrent misses hitting the database at once. Typical tools: edge caching, a small in-process cache, request coalescing, TTL jitter. A distributed lock is the better pick when recomputing the value is expensive.
- **Read-your-writes:** a creator must see their own write immediately, despite eventually consistent reads and caches that may hold stale or negative entries.

### Mistakes to avoid

- Presenting a single option.
- Deep diving into something generic.
- Sticking with the textbook answer when your own numbers say something simpler is enough.

---

## 8. Step 6: Bottlenecks, failure modes, and trade-offs

**Interview time:** about 5 minutes.

### Purpose

Until now you have argued that the design works. Here you attack it yourself, before the interviewer does, and then name what you gave up. Stating the costs of your own design is what makes the rest of it credible.

### How to tackle it

Go through the diagram box by box and ask three questions of each:

1. **What if it dies?**
2. **What if it gets slow?** This is usually worse than dying, and most candidates forget it.
3. **What if load grows 10x?**

For each failure, give: what happens, the mitigation, and the cost of the mitigation.

### Principles

- **A cache must be an optimisation the system can lose, never a dependency it needs.** Size the layer behind it to survive a partial loss, or shed load deliberately when over-provisioning for a rare event is too expensive.
- **Guard against slow dependencies** with tight timeouts and circuit breakers, so a sick component is skipped quickly.
- **Multi-region changes guarantees.** Cross-region replication is asynchronous, so a guarantee enforced within one region (such as uniqueness) does not hold across regions. Either keep writes in one region, or partition the keyspace so regions cannot conflict. Choose based on which path carries the strict availability promise.
- **Stateless instances lose nothing when they die.** Mention health checks and canary deploys on the path with the strict target.
- **Cover abuse** even when detection is out of scope: rate limiting, and what in the design makes a fast response possible.
- **At 10x, name which constraint bites first.** It is often cost, not capacity. Say what the next architectural move would be.
- **Name your single point of failure.** There is always something.

### Closing with trade-offs

End the step with a list in a fixed shape: what was chosen, what it cost, what it bought.

> "[Choice A] over [B]: we pay [cost], in exchange for [benefit]."

### What to say (template)

> "Let me stress the design. If [component] dies, [what happens], so I've [mitigation]. If it's slow, [mitigation]. If [region / store] goes down, [path] continues because [reason]; [other path] pauses, which the requirements allow. At 10x, the first constraint is [constraint], and the fix is [next move]. The main things I've traded away are [list]."

### Mistakes to avoid

- Listing failures without mitigations, or mitigations without their cost.
- Claiming there is no single point of failure.
- Only considering components that are down, and never ones that are slow.

---

## 9. Step 7: The tech lead layer

**Interview time:** 3 to 5 minutes, at the end or woven in when the interviewer asks how you would actually build it.

### Purpose

Steps 1 to 6 show you can design the system. This step shows you can lead a team through building and running it. It has four parts: phasing, cost, observability, and pushback on requirements.

### Phasing

- The design so far is the destination, not the first release. Building all of it on day one is a judgment error, and saying so earns credit.
- **The rule: decide early what is expensive to change, and defer what is cheap to add.**
  - Expensive to change: typically the data store and the data model, because migrating them under live traffic is costly.
  - Cheap to add: splitting a service, adding a cache layer, adding a region. These are additive.
- **Tie each phase to a trigger metric, never to a date.** A trigger is a traffic level, an incident type, a commitment made to customers, or a cost line someone questions.
- Put swappable parts behind interfaces in phase one.

A typical shape: phase 1 is the MVP on the final data store; phase 2 hardens (service split, extra caching, rate limiting, canaries); phase 3 scales out (more regions, edge logic, asynchronous pipelines).

### Cost

- Say where the money goes and which dial controls it. Rough proportions are enough.
- Identify the dominant cost driver (storage, memory, or request serving).
- Name the main dial and the levers that move it, with what each lever costs in behaviour.
- Give a unit metric that stays comparable as traffic grows, in the form "cost per million [operations]".

### Observability

Start from the promises in step 1 and work down.

- **Service level objectives:** one per promise, measured where the user experiences it. Convert availability targets into an error budget in minutes.
- **Leading indicators:** metrics that move before users notice, such as cache hit ratio per layer, database throttling, retry or collision rates, and unusual error rates that reveal abuse.
- **Alert on error budget burn rate,** not on CPU or memory. Page people for user impact only.
- **Run a synthetic probe** that exercises the full path end to end from several regions.

### Pushback on requirements

A tech lead shapes requirements instead of only accepting them.

- For each requirement that undermines a property the design depends on, state the cost so the product owner can decide.
- Ask what a failure would cost the business before agreeing to an expensive target.
- Flag features that need policy or prerequisites before they can ship safely.
- Ask whether this should be built at all, or whether an existing service is enough.

### What to say (template)

> "I wouldn't build all of this at once. Phase one is [MVP], because [the expensive-to-change thing] is painful to change later. I'd add [hardening] when [trigger], and [scale-out] when [trigger]. Cost is dominated by [driver], so [dial] is what I'd watch. I'd define SLOs on [promises] and alert on budget burn. And I'd push back on [requirements], because they undermine [property the design depends on]."

### Mistakes to avoid

- Presenting the final architecture as the day-one build.
- Listing metrics with no link to the promises they protect.
- Accepting every requirement without pricing it.

---

## 10. The reusable moves

A short list to revise before any interview.

- Propose assumptions and confirm; do not interrogate.
- Ask only questions whose answers change the design.
- Say what is out of scope, out loud.
- Attach a number or a consequence to every non-functional requirement.
- Split consistency by path: strict where correctness lives, eventual everywhere else.
- Every estimate ends in "so therefore".
- Skip numbers that constrain nothing, and say why.
- Access patterns first, database second.
- Name real technologies, with the property that earned the pick.
- Every box in the diagram traces to a requirement or a number.
- Trace one read and one write through the diagram.
- Name the hard part early and defer it on purpose.
- Every decision: why, how, alternatives and when they win, pros and cons.
- Every deep dive: problem, options, choice, when you would choose differently.
- Let your own numbers overrule the textbook answer.
- Stress each box three ways: dead, slow, 10x.
- A cache is an optimisation the system can lose, never a dependency.
- End with trade-offs: what was chosen, what it cost, what it bought.
- Decide early what is expensive to change; defer what is cheap to add.
- Phases are triggered by metrics, not dates.
- Alert on error budget burn, not on resource usage.
- Price every requirement before accepting it.
