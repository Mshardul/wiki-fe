import type { AsyncioScenario } from "./types";

export const ASYNCIO_SCENARIOS: AsyncioScenario[] = [
  {
    id: "happy",
    tab: "Happy path",
    short: "Three requests, one thread",
    q: "Three 10 ms requests finish in 12 ms on a single thread",
    traces: {
      main: {
        max: 14,
        unit: "ms",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 1, type: "run", label: "parse" },
              { s: 1, e: 9, type: "io", label: "await db.fetch()" },
              { s: 9, e: 10, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 1, e: 2, type: "run", label: "parse" },
              { s: 2, e: 10, type: "io", label: "await db.fetch()" },
              { s: 10, e: 11, type: "run", label: "respond" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 2, e: 3, type: "run", label: "parse" },
              { s: 3, e: 11, type: "io", label: "await db.fetch()" },
              { s: 11, e: 12, type: "run", label: "respond" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        t: 1,
        h: "A runs until its await",
        b: "A parses for 1 ms, then hits <code>await db.fetch()</code>. The coroutine suspends and hands the loop back.",
      },
      {
        t: 2,
        h: "B starts",
        b: "The loop starts B on its parse phase while A is suspended on database I/O.",
      },
      {
        t: 3,
        h: "B and C do the same",
        b: "The loop starts B, then C. By 3 ms all three requests are suspended on database I/O.",
      },
      {
        t: 9,
        h: "The loop waits",
        b: "Nothing is ready, so the loop sleeps in <code>select()</code> until a socket becomes readable. The loop row is empty.",
      },
      {
        t: 10,
        h: "A's reply arrives",
        b: "A's database call completes and it resumes on the loop to send its response.",
      },
      {
        t: 11,
        h: "B and C resume",
        b: "B and C get their database replies in turn and send their responses on the loop.",
      },
      {
        t: 12,
        h: "Waiting together",
        b: "Each database reply resumes its coroutine, which sends its response. Three 10 ms requests finish in 12 ms on one thread.",
      },
    ],
    take: "Async concurrency comes from waiting together, not running together. It only works if every handler yields at its waits.",
    gen: "Node.js, nginx workers, Netty, Redis: any single-threaded event loop with non-blocking I/O.",
  },
  {
    id: "blocking",
    tab: "Scenario 1",
    short: "One blocking call",
    q: "One blocking call inside async def. Why does every request freeze?",
    traces: {
      main: {
        max: 22,
        unit: "ms",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 1, type: "run", label: "parse" },
              { s: 1, e: 9, type: "io", label: "await db.fetch()" },
              { s: 9, e: 11, type: "wait", label: "reply ready" },
              { s: 11, e: 12, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 1, e: 9, type: "run", label: "requests.get()  · blocking" },
              { s: 9, e: 10, type: "run", label: "return" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 2, e: 10, type: "wait", label: "arrived, cannot start" },
              { s: 10, e: 11, type: "run", label: "parse" },
              { s: 11, e: 19, type: "io", label: "await db.fetch()" },
              { s: 19, e: 20, type: "run", label: "respond" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        t: 1,
        h: "A runs and awaits",
        b: "Exactly as in the happy path: A parses, awaits the database, and the loop is free.",
      },
      {
        t: 2,
        h: "C arrives",
        b: "C arrives at 2 ms but cannot start while the loop is still free; it will wait until B blocks the loop.",
      },
      {
        t: 6,
        h: "B blocks the loop",
        b: "B calls <code>requests.get()</code>. It waits on the network inside the loop thread, with no <code>await</code>, so the loop is stuck in B.",
        bad: true,
      },
      {
        t: 9,
        h: "A's reply is back",
        b: "A's database reply returns at 9 ms, but the loop cannot run it yet because B holds the thread.",
        bad: true,
      },
      {
        t: 10,
        h: "Everyone else was waiting",
        b: "C arrived at 2 ms and A's reply came back at 9 ms, but the loop could not run either. When B returns, the loop runs C first (queued earlier), then A.",
        bad: true,
      },
      {
        t: 11,
        h: "C runs first",
        b: "With B done, C takes the loop before A's suspended reply is processed.",
        bad: true,
      },
      {
        t: 12,
        h: "A finally responds",
        b: "A sends its response after C got the first turn on the loop.",
        bad: true,
      },
      {
        t: 19,
        h: "C awaits its database",
        b: "C's parse finished; it awaits the database before responding.",
        bad: true,
      },
      {
        t: 20,
        h: "Unrelated requests got slower",
        b: "Total time goes from 12 to 20 ms. A finishes at 12 instead of 10, C at 20 instead of 12, though neither changed. In production this is a p99 spike on endpoints that never call B's code.",
        bad: true,
      },
    ],
    take: "One blocking call taxes every request on that loop. Use an async client, or move the call off the loop with asyncio.to_thread().",
    gen: "Blocking the main thread in Node.js or a UI thread. Debug mode (PYTHONASYNCIODEBUG=1) logs any callback slower than 100 ms.",
  },
  {
    id: "cpu",
    tab: "Scenario 2",
    short: "CPU-heavy coroutine",
    q: "A CPU-heavy coroutine. Why do the others starve, and why doesn't to_thread() fix it?",
    traces: {
      hog: {
        max: 20,
        unit: "ms",
        label: "No yields",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 1, type: "run", label: "parse" },
              { s: 1, e: 5, type: "io", label: "await db" },
              { s: 5, e: 10, type: "wait", label: "reply ready" },
              { s: 10, e: 11, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            segs: [{ s: 1, e: 9, type: "run", label: "parse 50k rows (pure Python)" }],
          },
          {
            id: "C",
            segs: [
              { s: 2, e: 9, type: "wait", label: "cannot start" },
              { s: 9, e: 10, type: "run", label: "parse" },
              { s: 10, e: 18, type: "io", label: "await db.fetch()" },
              { s: 18, e: 19, type: "run", label: "respond" },
            ],
          },
        ],
      },
      chunk: {
        max: 20,
        unit: "ms",
        label: "await asyncio.sleep(0) every chunk",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 1, type: "run", label: "parse" },
              { s: 1, e: 5, type: "io", label: "await db" },
              { s: 5, e: 6, type: "wait" },
              { s: 6, e: 7, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 1, e: 3, type: "run", label: "chunk 1" },
              { s: 3, e: 4, type: "wait" },
              { s: 4, e: 6, type: "run", label: "chunk 2" },
              { s: 6, e: 7, type: "wait" },
              { s: 7, e: 9, type: "run", label: "chunk 3" },
              { s: 9, e: 11, type: "run", label: "chunk 4" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 2, e: 3, type: "wait" },
              { s: 3, e: 4, type: "run", label: "parse" },
              { s: 4, e: 12, type: "io", label: "await db.fetch()" },
              { s: 12, e: 13, type: "run", label: "respond" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        trace: "hog",
        t: 1,
        h: "B grabs the loop",
        b: "A finishes its parse; B immediately starts pure-Python work and never awaits.",
        bad: true,
      },
      {
        trace: "hog",
        t: 2,
        h: "C cannot start",
        b: "C arrives while B is already holding the loop on pure Python.",
        bad: true,
      },
      {
        trace: "hog",
        t: 5,
        h: "A waits on the database",
        b: "A is suspended on I/O; its reply will sit unread until B yields the loop.",
        bad: true,
      },
      {
        trace: "hog",
        t: 9,
        h: "B holds the loop for 8 ms",
        b: "Same shape as scenario 1, but B is busy, not waiting. A's reply sits unread and C cannot start.",
        bad: true,
      },
      {
        trace: "hog",
        t: 10,
        h: "B finally yields",
        b: "When B's CPU work ends, the loop can finally run waiting coroutines.",
        bad: true,
      },
      {
        trace: "hog",
        t: 11,
        h: "C runs briefly",
        b: "C takes the loop for its short parse before awaiting the database.",
        bad: true,
      },
      {
        trace: "hog",
        t: 18,
        h: "C awaits the database",
        b: "C yields at its database call while the loop is free again.",
        bad: true,
      },
      {
        trace: "hog",
        t: 19,
        h: "C responds",
        b: "C's database call completes and it sends the response.",
        bad: true,
      },
      {
        trace: "hog",
        t: 20,
        h: "Why to_thread() is the wrong fix",
        b: "A thread would free the loop thread, but pure-Python parsing needs the GIL, so the loop would still compete with B for every bytecode. CPU work belongs in a process pool.",
        bad: true,
      },
      {
        trace: "chunk",
        t: 1,
        h: "Chunk 1 starts",
        b: "B runs its first 2 ms chunk on the loop.",
      },
      {
        trace: "chunk",
        t: 2,
        h: "C queues",
        b: "C arrives and waits while B holds chunk 1.",
      },
      {
        trace: "chunk",
        t: 3,
        h: "A chunk yields",
        b: "B finishes chunk 1 and yields with a short wait segment before chunk 2.",
      },
      {
        trace: "chunk",
        t: 4,
        h: "C slips in",
        b: "The yield hands the loop back, so C can run its parse before B resumes chunk 2.",
      },
      {
        trace: "chunk",
        t: 5,
        h: "A is on I/O",
        b: "A suspends on the database while B and C trade the loop in slices.",
      },
      {
        trace: "chunk",
        t: 6,
        h: "A resumes",
        b: "A's database call completes and it takes a short turn on the loop.",
      },
      {
        trace: "chunk",
        t: 7,
        h: "Yield every chunk",
        b: "Split the work into 2 ms chunks with <code>await asyncio.sleep(0)</code> between them. Each yield hands the loop back, so A and C slip in between B's chunks.",
      },
      {
        trace: "chunk",
        t: 9,
        h: "Chunk 3 runs",
        b: "B runs chunk 3 before the final stretch of CPU work.",
      },
      {
        trace: "chunk",
        t: 11,
        h: "Chunk 4",
        b: "B finishes the last chunk of parsed rows.",
      },
      {
        trace: "chunk",
        t: 12,
        h: "C's I/O completes",
        b: "C returns from its database call.",
      },
      {
        trace: "chunk",
        t: 13,
        h: "Responsive, not faster",
        b: "A finishes at 7 ms instead of 11, and C's database call starts at 4 instead of 10. B finishes a little later. Chunking keeps the loop responsive but adds no capacity.",
      },
    ],
    take: "For real CPU work, use a ProcessPoolExecutor or a separate worker service. Chunking with sleep(0) keeps the loop responsive but doesn't add capacity.",
    gen: "Cooperative scheduling everywhere: Node.js setImmediate chunking, Go before async preemption, UI frameworks that slice work across frames.",
  },
  {
    id: "fastapi",
    tab: "Scenario 3",
    short: "def vs async def",
    q: "Why is a blocking call fine in a FastAPI def endpoint but fatal in async def?",
    traces: {
      main: {
        max: 14,
        unit: "ms",
        label: "A, B: def endpoint · C: async def",
        lanes: [
          {
            id: "A",
            name: "A def",
            segs: [
              { s: 0, e: 0.5, type: "run", label: "dispatch" },
              { s: 0.5, e: 8.5, type: "thr", label: "time.sleep(8) in thread 1" },
              { s: 8.5, e: 9, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            name: "B def",
            segs: [
              { s: 1, e: 1.5, type: "run", label: "dispatch" },
              { s: 1.5, e: 9.5, type: "thr", label: "time.sleep(8) in thread 2" },
              { s: 9.5, e: 10, type: "run", label: "respond" },
            ],
          },
          {
            id: "C",
            name: "C async",
            segs: [
              { s: 2, e: 3, type: "run", label: "parse" },
              { s: 3, e: 11, type: "io", label: "await db.fetch()" },
              { s: 11, e: 12, type: "run", label: "respond" },
            ],
          },
        ],
      },
      pool: {
        max: 20,
        unit: "ms",
        label: "Thread pool limit shown as 2 (default 40)",
        lanes: [
          {
            id: "A",
            name: "A def",
            segs: [
              { s: 0, e: 0.5, type: "run", label: "dispatch" },
              { s: 0.5, e: 8.5, type: "thr", label: "thread 1" },
              { s: 8.5, e: 9, type: "run", label: "respond" },
            ],
          },
          {
            id: "B",
            name: "B def",
            segs: [
              { s: 1, e: 1.5, type: "run", label: "dispatch" },
              { s: 1.5, e: 9.5, type: "thr", label: "thread 2" },
              { s: 9.5, e: 10, type: "run", label: "respond" },
            ],
          },
          {
            id: "D",
            name: "D def",
            segs: [
              { s: 2, e: 2.5, type: "run", label: "dispatch" },
              { s: 2.5, e: 8.5, type: "wait", label: "waiting for a free thread" },
              { s: 8.5, e: 16.5, type: "thr", label: "thread 1" },
              { s: 16.5, e: 17, type: "run", label: "respond" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        trace: "main",
        t: 0.5,
        h: "A to a thread",
        b: "FastAPI hands A's blocking endpoint to worker thread 1.",
      },
      {
        trace: "main",
        t: 1,
        h: "B arrives",
        b: "The loop accepts B while A already sleeps off-thread.",
      },
      {
        trace: "main",
        t: 1.5,
        h: "Dispatch to a thread",
        b: "FastAPI runs a plain <code>def</code> endpoint in a worker thread. The loop spends a fraction of a millisecond handing A, then B, to the pool.",
      },
      {
        trace: "main",
        t: 2,
        h: "C arrives",
        b: "C is an <code>async def</code> handler and stays on the loop.",
      },
      {
        trace: "main",
        t: 3,
        h: "C runs on the loop",
        b: "C parses on the loop while A and B sleep in worker threads.",
      },
      {
        trace: "main",
        t: 6,
        h: "Threads block, the loop doesn't",
        b: "A and B sleep in their threads (a blocking sleep releases the GIL). C runs on the loop, awaits its database, and is unaffected.",
      },
      {
        trace: "main",
        t: 8.5,
        h: "A's thread returns",
        b: "A's <code>time.sleep</code> finishes in the worker thread.",
      },
      {
        trace: "main",
        t: 9,
        h: "A responds",
        b: "The loop sends A's response.",
      },
      {
        trace: "main",
        t: 9.5,
        h: "B's thread returns",
        b: "B's sleep finishes in thread 2.",
      },
      {
        trace: "main",
        t: 10,
        h: "B responds",
        b: "B's response goes out on the loop.",
      },
      {
        trace: "main",
        t: 11,
        h: "C's database returns",
        b: "C resumes from <code>await db.fetch()</code>.",
      },
      {
        trace: "main",
        t: 12,
        h: "C finishes on time",
        b: "Each thread finishes and the loop sends the response. C takes its normal 10 ms. The same <code>time.sleep</code> inside <code>async def</code> would have been scenario 1.",
      },
      {
        trace: "pool",
        t: 0.5,
        h: "A to thread 1",
        b: "Same opening as the main trace: A blocks in a worker thread.",
      },
      {
        trace: "pool",
        t: 1,
        h: "B arrives",
        b: "The loop accepts B and starts dispatching it to the thread pool. Thread 2 picks up on the next step.",
      },
      {
        trace: "pool",
        t: 1.5,
        h: "B on thread 2",
        b: "Both pool slots are now busy: A on thread 1, B on thread 2.",
      },
      {
        trace: "pool",
        t: 2,
        h: "D arrives",
        b: "A fourth <code>def</code> request shows up with both threads taken.",
      },
      {
        trace: "pool",
        t: 2.5,
        h: "D waits for a thread",
        b: "D arrives while both worker threads are busy and queues for a free slot.",
        bad: true,
      },
      {
        trace: "pool",
        t: 6,
        h: "The pool has a ceiling",
        b: "Starlette's pool defaults to 40 threads (shown here as 2). D arrives while both are busy and waits for a thread, even though the loop is idle.",
        bad: true,
      },
      {
        trace: "pool",
        t: 8.5,
        h: "Thread 1 frees up",
        b: "A finishes and thread 1 becomes available.",
      },
      {
        trace: "pool",
        t: 9,
        h: "D runs in thread 1",
        b: "D takes the freed worker thread and starts its blocking sleep.",
      },
      {
        trace: "pool",
        t: 9.5,
        h: "Thread 2 frees up",
        b: "B finishes in thread 2.",
      },
      {
        trace: "pool",
        t: 10,
        h: "B responds",
        b: "The loop sends B's response while D still sleeps in thread 1.",
      },
      {
        trace: "pool",
        t: 16.5,
        h: "D finally runs",
        b: "When thread 1 frees up, D gets a worker and finishes its blocking sleep there.",
      },
      {
        trace: "pool",
        t: 17,
        h: "D paid for someone else's sleep",
        b: "D only starts when thread 1 frees up at 8.5 ms. The 41st concurrent blocking request queues the same way.",
        bad: true,
      },
    ],
    take: "Write async def only when every call inside it is awaitable; otherwise write def. Under heavy blocking load, raise the AnyIO limiter’s total_tokens or remove the blocking.",
    gen: "Any async framework with a sync escape hatch: Django's sync_to_async, Node's libuv threadpool (4 threads by default for file I/O and DNS).",
  },
];
