import type { GilScenario } from "./types";

export const GIL_SCENARIOS: GilScenario[] = [
  {
    id: "happy",
    tab: "Happy path",
    short: "I/O-bound threads",
    q: "I/O-bound threads interleave: the GIL changes hands at every blocking call",
    traces: {
      main: {
        max: 20,
        unit: "ms",
        lanes: [
          {
            id: "T1",
            segs: [
              {
                s: 0,
                e: 3,
                type: "run",
                label: "Python",
              },
              {
                s: 3,
                e: 9,
                type: "io",
                label: "recv()",
              },
              {
                s: 9,
                e: 12,
                type: "run",
                label: "Python",
              },
              {
                s: 12,
                e: 20,
                type: "io",
                label: "recv()",
              },
            ],
          },
          {
            id: "T2",
            segs: [
              {
                s: 0,
                e: 4,
                type: "io",
                label: "recv()",
              },
              {
                s: 4,
                e: 8,
                type: "run",
                label: "Python",
              },
              {
                s: 8,
                e: 15,
                type: "io",
                label: "send()",
              },
              {
                s: 15,
                e: 18,
                type: "run",
                label: "Python",
              },
              {
                s: 18,
                e: 20,
                type: "io",
                label: "recv()",
              },
            ],
          },
        ],
        timers: [],
        reqs: [],
        ticks: [],
      },
    },
    frames: [
      {
        t: 3,
        h: "T1 runs",
        b: "T1 holds the GIL and executes bytecode. T2 is inside <code>recv()</code> with the GIL released: it is waiting on the network, not on the GIL.",
      },
      {
        t: 4,
        h: "T1 hits a blocking call",
        b: "Before the syscall, CPython releases the GIL (<code>Py_BEGIN_ALLOW_THREADS</code>). The GIL is free. No timer, no drop request.",
      },
      {
        t: 8,
        h: "T2's data arrives",
        b: "T2 returns from <code>recv()</code>, takes the free GIL (<code>Py_END_ALLOW_THREADS</code>) and runs its Python code.",
      },
      {
        t: 9,
        h: "T2 blocks on send()",
        b: "T2 releases the GIL before its <code>send()</code> syscall. Both threads are now inside blocking calls, the GIL is free, and nobody is waiting for it.",
      },
      {
        t: 12,
        h: "T1's data arrives",
        b: "T1 returns from <code>recv()</code> and takes the free GIL straight away. No timer, no drop request: T2 is still inside <code>send()</code> and does not need the GIL.",
      },
      {
        t: 15,
        h: "T1 blocks on recv() again",
        b: "T1 releases the GIL for its next <code>recv()</code>. T2's <code>send()</code> is still in flight, so the GIL sits free.",
      },
      {
        t: 18,
        h: "T2 runs after send()",
        b: "T2's <code>send()</code> has finished. It takes the free GIL and runs its Python code.",
      },
      {
        t: 20,
        h: "The waits overlap",
        b: "Each thread releases at its next blocking call. Wall time tracks the longest wait, not the sum of waits. The switch timer never fires.",
      },
    ],
    take: "The GIL serializes Python bytecode, not waiting. Threads are a valid tool for blocking I/O.",
    gen: "Any C code that wraps long work in the same release macros. NumPy on large arrays, hashlib on large buffers and zlib release the GIL, which is how threads get real parallelism for those calls.",
  },
  {
    id: "cpu",
    tab: "Scenario 1",
    short: "CPU-bound threads",
    q: "Why don't more threads speed up CPU-bound code?",
    traces: {
      main: {
        max: 20,
        unit: "ms",
        tickEvery: 0.5,
        lanes: [
          {
            id: "T1",
            segs: [
              {
                s: 0,
                e: 5.2,
                type: "run",
                label: "pure-Python loop",
              },
              {
                s: 5.2,
                e: 10.4,
                type: "wait",
              },
              {
                s: 10.4,
                e: 15.6,
                type: "run",
                label: "pure-Python loop",
              },
              {
                s: 15.6,
                e: 20,
                type: "wait",
              },
            ],
          },
          {
            id: "T2",
            segs: [
              {
                s: 0,
                e: 5.2,
                type: "wait",
              },
              {
                s: 5.2,
                e: 10.4,
                type: "run",
                label: "pure-Python loop",
              },
              {
                s: 10.4,
                e: 15.6,
                type: "wait",
              },
              {
                s: 15.6,
                e: 20,
                type: "run",
                label: "pure-Python loop",
              },
            ],
          },
        ],
        timers: [
          {
            lane: "T2",
            s: 0,
            e: 5,
          },
          {
            lane: "T1",
            s: 5.2,
            e: 10.2,
          },
          {
            lane: "T2",
            s: 10.4,
            e: 15.4,
          },
          {
            lane: "T1",
            s: 15.6,
            e: 20.6,
          },
        ],
        reqs: [
          {
            t: 5,
            from: "T2",
            to: "T1",
          },
          {
            t: 10.2,
            from: "T1",
            to: "T2",
          },
          {
            t: 15.4,
            from: "T2",
            to: "T1",
          },
        ],
        ticks: [
          {
            lane: "T1",
            t: 5.2,
          },
          {
            lane: "T2",
            t: 10.4,
          },
          {
            lane: "T1",
            t: 15.6,
          },
        ],
      },
    },
    frames: [
      {
        t: 2.5,
        h: "T1 runs, T2 waits",
        b: "Both threads run pure Python. T1 holds the GIL. T2 is ready but blocked, and its 5 ms switch timer is counting down.",
      },
      {
        t: 5,
        h: "The timer expires",
        b: "No handoff happened in 5 ms, so T2 sets the drop request on the eval breaker.",
      },
      {
        t: 5.2,
        h: "T1 reaches a checkpoint",
        b: "At its next loop back-edge, T1 sees the request and drops the GIL. It will not take the lock straight back.",
      },
      {
        t: 10.2,
        h: "T1's timer expires",
        b: "The roles have swapped: T2 runs and T1 waits with its own 5 ms timer. No handoff happened in 5 ms, so T1 sets the drop request.",
      },
      {
        t: 10.4,
        h: "T2 reaches a checkpoint",
        b: "At its next loop back-edge, T2 sees the request and drops the GIL.",
      },
      {
        t: 15.4,
        h: "T2's timer expires again",
        b: "T1 has run for 5 ms while T2 waited. T2 sets the drop request, exactly as at 5 ms.",
      },
      {
        t: 15.6,
        h: "T1 hands over again",
        b: "T1 drops the GIL at its next checkpoint. Every handoff costs a full timer interval plus the wait for a checkpoint.",
      },
      {
        t: 20,
        h: "~5 ms slices, never parallel",
        b: "Only one lane is solid at any instant. Total time is the sum of both threads' work plus switching overhead. Four threads only add lanes.",
      },
    ],
    take: "Threads give concurrency, not parallelism, for pure-Python CPU work. The overhead is the cost of forcing handoffs.",
    gen: "Any runtime with one global execution lock, such as CRuby's GVL. Fix: processes (ProcessPoolExecutor), or move the hot loop into C that releases the GIL.",
  },
  {
    id: "convoy",
    tab: "Scenario 2",
    short: "Convoy effect",
    q: "Why did adding one CPU-bound thread hurt my I/O thread's latency?",
    traces: {
      main: {
        max: 12,
        unit: "ms",
        tickEvery: 0.5,
        lanes: [
          {
            id: "T1",
            name: "T1 CPU",
            segs: [
              {
                s: 0,
                e: 0.4,
                type: "wait",
              },
              {
                s: 0.4,
                e: 5.8,
                type: "run",
                label: "spin()",
              },
              {
                s: 5.8,
                e: 6.2,
                type: "wait",
              },
              {
                s: 6.2,
                e: 11.5,
                type: "run",
                label: "spin()",
              },
            ],
          },
          {
            id: "T2",
            name: "T2 I/O",
            segs: [
              {
                s: 0,
                e: 0.4,
                type: "run",
              },
              {
                s: 0.4,
                e: 0.7,
                type: "io",
                label: "recv",
              },
              {
                s: 0.7,
                e: 5.8,
                type: "wait",
              },
              {
                s: 5.8,
                e: 6.2,
                type: "run",
              },
              {
                s: 6.2,
                e: 6.5,
                type: "io",
                label: "send",
              },
              {
                s: 6.5,
                e: 11.5,
                type: "wait",
              },
            ],
          },
        ],
        timers: [
          {
            lane: "T2",
            s: 0.7,
            e: 5.7,
          },
          {
            lane: "T2",
            s: 6.5,
            e: 11.5,
          },
        ],
        reqs: [
          {
            t: 5.7,
            from: "T2",
            to: "T1",
          },
          {
            t: 11.5,
            from: "T2",
            to: "T1",
          },
        ],
        ticks: [
          {
            lane: "T1",
            t: 5.8,
          },
        ],
      },
    },
    frames: [
      {
        t: 0.4,
        h: "T2 calls recv()",
        b: "T2 runs briefly, then releases the GIL before the syscall, exactly as in the happy path. T1 has been waiting for it.",
      },
      {
        t: 0.7,
        h: "T1 grabs it, recv() returns at once",
        b: "T1 takes the free GIL and spins. The data was already buffered, so <code>recv()</code> returns in microseconds. But T2 now needs the GIL to touch its data, and it has to wait.",
      },
      {
        t: 5.7,
        h: "A full switch interval later",
        b: "T2 has waited 5 ms for the GIL while T1 spins. Its timer expires and it sets the drop request.",
      },
      {
        t: 5.8,
        h: "T1 hands over at a checkpoint",
        b: "T1 drops the GIL at its next checkpoint. The hatched stretch is the 5 ms T2 waited on one fast syscall.",
      },
      {
        t: 6.2,
        h: "T2 runs briefly",
        b: "T2 took the GIL and ran a few microseconds of Python, up to <code>sendall()</code>.",
      },
      {
        t: 6.5,
        h: "sendall() repeats the cycle",
        b: "<code>sendall()</code> returns almost at once. T1 has already taken the GIL back and is spinning, so T2 has to wait again.",
      },
      {
        t: 11.5,
        h: "Throughput collapses",
        b: "The second call is the same as the first. <code>sendall()</code> returned at once, and T2 has waited out another whole switch interval. Every I/O call pays that tax. When this was reported in 2010 (bpo-7946), one spinning thread made an echo-server transfer more than 4x slower.",
      },
    ],
    take: "The GIL has no notion of I/O priority. A CPU-bound thread in the same process quietly taxes every I/O-bound thread.",
    gen: "Priority inversion and head-of-line blocking in any shared-lock design. Fix: move CPU work to processes or GIL-releasing C code. Lowering sys.setswitchinterval() trades throughput for latency.",
  },
  {
    id: "race",
    tab: "Scenario 3",
    short: "Race conditions",
    q: "My race-condition demo stopped failing on newer Python. Is my code safe now?",
    traces: {
      A: {
        max: 12,
        unit: null,
        label: "Version A · counter += 1",
        lanes: [
          {
            id: "T1",
            segs: [
              {
                s: 0,
                e: 1,
                type: "run",
                label: "LOAD counter",
              },
              {
                s: 1,
                e: 2,
                type: "run",
                label: "LOAD 1",
              },
              {
                s: 2,
                e: 3,
                type: "run",
                label: "ADD",
              },
              {
                s: 3,
                e: 4,
                type: "run",
                label: "STORE",
              },
              {
                s: 4,
                e: 5,
                type: "run",
                label: "JUMP ↺",
              },
              {
                s: 5,
                e: 12,
                type: "wait",
              },
            ],
          },
          {
            id: "T2",
            segs: [
              {
                s: 0,
                e: 5,
                type: "wait",
              },
              {
                s: 5,
                e: 12,
                type: "run",
                label: "next increments…",
              },
            ],
          },
        ],
        timers: [],
        reqs: [
          {
            t: 1.5,
            from: "T2",
            to: "T1",
            label: "drop request (pending)",
          },
        ],
        ticks: [
          {
            lane: "T1",
            t: 5,
          },
        ],
        counter: [
          {
            t: 0,
            v: "100",
          },
          {
            t: 4,
            v: "101",
          },
          {
            t: 12,
            v: "101 + T2's work, nothing lost",
          },
        ],
      },
      B: {
        max: 14,
        unit: null,
        label: "Version B · counter += one()",
        lanes: [
          {
            id: "T1",
            segs: [
              {
                s: 0,
                e: 1,
                type: "run",
                label: "LOAD counter",
              },
              {
                s: 1,
                e: 2,
                type: "run",
                label: "LOAD one",
              },
              {
                s: 2,
                e: 3,
                type: "run",
                label: "CALL",
              },
              {
                s: 3,
                e: 11,
                type: "wait",
              },
              {
                s: 11,
                e: 12,
                type: "run",
                label: "ADD",
              },
              {
                s: 12,
                e: 13,
                type: "run",
                label: "STORE",
              },
            ],
          },
          {
            id: "T2",
            segs: [
              {
                s: 0,
                e: 3,
                type: "wait",
              },
              {
                s: 3,
                e: 11,
                type: "run",
                label: "500 increments",
              },
            ],
          },
        ],
        timers: [],
        reqs: [
          {
            t: 1.5,
            from: "T2",
            to: "T1",
            label: "drop request (pending)",
          },
        ],
        ticks: [
          {
            lane: "T1",
            t: 3,
            label: "RESUME in one()",
          },
        ],
        counter: [
          {
            t: 0,
            v: "100",
            note: "T1 read 100",
          },
          {
            t: 11,
            v: "600",
          },
          {
            t: 13,
            v: "101 · 499 lost",
            bad: true,
          },
        ],
      },
    },
    frames: [
      {
        trace: "A",
        t: 1.5,
        h: "Version A: counter += 1",
        b: "T1 loads <code>counter</code> (100) and starts the increment. Partway through, T2 sets a drop request. T1 only acts on it at a checkpoint.",
      },
      {
        trace: "A",
        t: 4,
        h: "The increment completes",
        b: "The drop request is still pending, but none of load, add or store is a checkpoint. The increment completes and stores 101.",
      },
      {
        trace: "A",
        t: 5,
        h: "The switch lands between increments",
        b: "The only checkpoint is the backward jump, after the store. T1 sees the request there and drops the GIL with no half-done increment.",
      },
      {
        trace: "A",
        t: 12,
        h: "T2 runs on, nothing lost",
        b: "Every handoff happens on a complete increment, so the final count is correct on 3.10+.",
      },
      {
        trace: "B",
        t: 1.5,
        h: "Version B: counter += one()",
        b: "Same loop, but the right-hand side is a call. T1 has already loaded <code>counter</code> (100) onto its stack when the drop request arrives.",
      },
      {
        trace: "B",
        t: 3,
        h: "Entering one() is a checkpoint",
        b: "The call starts a new frame, and RESUME checks the eval breaker. The pending request fires, and T1 drops the GIL while holding the stale value 100.",
      },
      {
        trace: "B",
        t: 11,
        h: "T2 runs on",
        b: "T2 completes 500 increments. <code>counter</code> is now 600.",
      },
      {
        trace: "B",
        t: 13,
        h: "T1 stores 101",
        b: "T1 adds 1 to its stale 100 and stores 101, wiping out T2's work. Lost updates are back, and the count differs on every run.",
      },
    ],
    take: "The GIL protects CPython's internals, not your invariants. Where switches happen is an implementation detail; it changed in 3.10 and there is no GIL at all on the free-threaded build. Use threading.Lock for read-modify-write.",
    gen: 'Any "it works because of the scheduler" bug. A test that passes is not proof of atomicity.',
  },
];
