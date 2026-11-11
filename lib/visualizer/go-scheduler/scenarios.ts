import type { GoScenario, GoSeg } from "./types";

const seg = (
  s: number,
  e: number,
  type: GoSeg["type"],
  label?: string,
  p?: string | null,
): GoSeg => ({
  s,
  e,
  type,
  ...(label ? { label } : {}),
  ...(p !== undefined ? { p } : {}),
});

export const GO_SCHEDULER_SCENARIOS: GoScenario[] = [
  {
    id: "happy",
    tab: "Happy path",
    short: "Run queues & stealing",
    q: "Two Ps, one lopsided queue: how work stealing evens it out",
    traces: {
      main: {
        max: 12,
        ps: ["P0", "P1"],
        lanes: [
          {
            id: "M0",
            segs: [
              seg(0, 3, "run", "G1", "P0"),
              seg(3, 6, "run", "G2", "P0"),
              seg(6, 9, "run", "G6", "P0"),
            ],
          },
          {
            id: "M1",
            segs: [
              seg(0, 4, "run", "G3", "P1"),
              seg(4, 7, "run", "G4", "P1"),
              seg(7, 10, "run", "G5", "P1"),
            ],
          },
        ],
        marks: [{ t: 4, lane: "M1", label: "P1 steals G4, G5", info: true }],
      },
    },
    frames: [
      {
        t: 2,
        h: "Two Ps, two threads",
        b: "M0 holds P0 and runs G1; M1 holds P1 and runs G3. G1 spawned four goroutines, so they all sit on P0's local queue.",
        q: { P0: ["G2", "G4", "G5", "G6"], P1: [], global: [] },
      },
      {
        t: 3,
        h: "G1 still on M0",
        b: "G1 is still executing on P0 before it finishes.",
        q: { P0: ["G2", "G4", "G5", "G6"], P1: [], global: [] },
      },
      {
        t: 3.3,
        h: "G1 finishes",
        b: "P0 takes the next goroutine from its own queue. No lock and no OS thread switch: it is a function call on the same thread.",
        q: { P0: ["G4", "G5", "G6"], P1: [], global: [] },
      },
      {
        t: 4,
        h: "G2 runs on P0",
        b: "P0 runs G2 from its local queue while M1 still runs G3.",
        q: { P0: ["G4", "G5", "G6"], P1: [], global: [] },
      },
      {
        t: 4.3,
        h: "P1 runs dry and steals",
        b: "G3 is done, P1's queue is empty and so is the global queue. P1 picks a victim and takes half of P0's waiting goroutines.",
        q: { P0: ["G6"], P1: ["G5"], global: [] },
      },
      {
        t: 7,
        h: "Work spread across Ps",
        b: "Stolen goroutines run on P1 while P0 drains its remainder.",
        q: { P0: ["G6"], P1: ["G5"], global: [] },
      },
      {
        t: 10,
        h: "Balanced",
        b: "Both P rows stay full until the work is done, though it all started on P0. No central dispatcher decided this.",
        q: { P0: [], P1: [], global: [] },
      },
    ],
    take: "Goroutines are cheap because switching is a user-space call on the same thread, and work stealing spreads them across Ps automatically.",
    gen: "Work-stealing schedulers: Java's ForkJoinPool, Rust's Tokio, Intel TBB.",
  },
  {
    id: "syscall",
    tab: "Scenario 1",
    short: "Blocking syscall",
    q: "A goroutine makes a blocking syscall. How does the program keep running?",
    traces: {
      main: {
        max: 14,
        ps: ["P0"],
        lanes: [
          {
            id: "M0",
            segs: [
              seg(0, 2, "run", "G1", "P0"),
              seg(2, 10, "syscall", "G1 blocked in read() syscall"),
              seg(10, 10.5, "run", "", null),
              seg(10.5, 14, "park", "parked, no P"),
            ],
          },
          {
            id: "M1",
            segs: [
              seg(0, 2.4, "park", "idle"),
              seg(2.4, 6, "run", "G2", "P0"),
              seg(6, 10.5, "run", "G3", "P0"),
              seg(10.5, 12, "run", "G1", "P0"),
            ],
          },
        ],
        marks: [{ t: 2.4, lane: "M1", label: "sysmon hands P0 to M1" }],
      },
    },
    frames: [
      {
        t: 2,
        h: "G1 enters the syscall",
        b: 'G1 reads a large file. M0 blocks in the kernel with G1 attached. P0 is marked "in syscall" and stuck with it, with G2 and G3 waiting.',
        q: { P0: ["G2", "G3"], global: [] },
      },
      {
        t: 2.4,
        h: "sysmon takes the P away",
        b: "sysmon sees P0 stuck in a syscall with work waiting and hands it to another thread, M1. Go code keeps running, now on a different OS thread.",
        q: { P0: ["G3"], global: [] },
      },
      {
        t: 4,
        h: "G2 runs on M1",
        b: "M1 holds P0 and runs G2 while M0 stays blocked in the kernel.",
        q: { P0: ["G3"], global: [] },
      },
      {
        t: 6,
        h: "G3 runs",
        b: "G3 takes the processor on M1.",
        q: { P0: ["G3"], global: [] },
      },
      {
        t: 10,
        h: "Syscall still blocked",
        b: "M0 is still in the blocking read while M1 runs Go code with P0.",
        q: { P0: [], global: [] },
      },
      {
        t: 10.4,
        h: "The syscall returns, but there is no P",
        b: "M0 wakes with G1 and tries to get a P. None is free, so it puts G1 on the global run queue and parks itself.",
        q: { P0: [], global: ["G1"] },
      },
      {
        t: 10.5,
        h: "M0 parks",
        b: "M0 has no processor and parks while G1 waits on the global queue.",
        q: { P0: [], global: ["G1"] },
      },
      {
        t: 12,
        h: "Two threads for one P",
        b: "G1 resumes on M1. Many concurrent blocking syscalls or cgo calls each cost a thread; the runtime aborts at 10,000 threads by default.",
        q: { P0: [], global: [] },
      },
    ],
    take: "GOMAXPROCS limits threads running Go code, not total threads. Each blocking syscall costs a thread while it blocks.",
    gen: "Any M:N scheduler facing blocking calls: the same reason asyncio sends blocking calls to a threadpool, and libuv uses one for file I/O.",
  },
  {
    id: "netpoll",
    tab: "Scenario 2",
    short: "Network I/O",
    q: "conn.Read() blocks too. Why doesn't it cost a thread?",
    traces: {
      main: {
        max: 14,
        ps: ["P0"],
        lanes: [
          {
            id: "M0",
            segs: [
              seg(0, 2, "run", "G1", "P0"),
              seg(2, 6, "run", "G2", "P0"),
              seg(6, 9, "run", "G3", "P0"),
              seg(9, 11, "run", "G1", "P0"),
            ],
          },
          {
            id: "netpoll",
            name: "netpoll",
            segs: [
              seg(2, 7, "poll", "G1 parked on socket (epoll)"),
              seg(7, 9, "queued", "G1 runnable"),
            ],
          },
          {
            id: "M1",
            segs: [seg(0, 14, "park", "never needed")],
          },
        ],
        marks: [{ t: 7, lane: "netpoll", label: "data arrives", info: true }],
      },
    },
    frames: [
      {
        t: 2,
        h: "G1 reads the socket",
        b: 'Sockets are non-blocking underneath. The read returns "would block", so the runtime registers the socket with epoll and parks G1. M0 does not block.',
        q: { P0: ["G2", "G3"], global: [], netpoll: ["G1"] },
      },
      {
        t: 5,
        h: "Same thread, next goroutine",
        b: "M0 keeps P0 and runs G2. No hand-off, no second thread. Compare scenario 1, where the same-looking code needed M1.",
        q: { P0: ["G3"], global: [], netpoll: ["G1"] },
      },
      {
        t: 6,
        h: "G3 runs",
        b: "G3 runs on P0 while G1 stays on the netpoller.",
        q: { P0: ["G3"], global: [], netpoll: ["G1"] },
      },
      {
        t: 7,
        h: "Socket still waiting",
        b: "G1 remains parked on epoll until data arrives.",
        q: { P0: ["G3"], global: [], netpoll: ["G1"] },
      },
      {
        t: 7.3,
        h: "Data arrives",
        b: "When the scheduler looks for work it checks the netpoller (sysmon also polls if nobody has for 10 ms). G1 becomes runnable and joins the queue.",
        q: { P0: ["G1"], global: [], netpoll: [] },
      },
      {
        t: 9,
        h: "G1 resumes",
        b: "G1 runs again on M0 with P0.",
        q: { P0: ["G1"], global: [], netpoll: [] },
      },
      {
        t: 11,
        h: "One thread throughout",
        b: "G1 resumes as if <code>Read</code> had simply returned. This is how a Go server holds 100k connections without 100k threads. File I/O is not netpolled and goes through scenario 1.",
        q: { P0: [], global: [], netpoll: [] },
      },
    ],
    take: "Go gives you blocking-style code with event-loop efficiency for network I/O. The netpoller is the event loop, hidden inside the runtime.",
    gen: "The asyncio visualizer's event loop: the same epoll mechanism, but Go parks the whole goroutine stack, so you never write await.",
  },
  {
    id: "preempt",
    tab: "Scenario 3",
    short: "Tight loop",
    q: "A tight loop with no function calls. Why could it hog a P before Go 1.14?",
    traces: {
      old: {
        max: 40,
        ps: ["P0"],
        label: "Go 1.13 · cooperative only",
        lanes: [
          {
            id: "M0",
            segs: [seg(0, 40, "run", "G1   for { x++ }   (no function calls)", "P0")],
          },
        ],
        marks: [{ t: 10, lane: "M0", label: "preempt flag set, never checked" }],
      },
      neu: {
        max: 40,
        ps: ["P0"],
        label: "Go 1.14+ · asynchronous preemption",
        lanes: [
          {
            id: "M0",
            segs: [
              seg(0, 10, "run", "G1", "P0"),
              seg(10, 12, "run", "G2", "P0"),
              seg(12, 22, "run", "G1", "P0"),
              seg(22, 24, "run", "G3", "P0"),
              seg(24, 40, "run", "G1", "P0"),
            ],
          },
        ],
        marks: [
          { t: 10, lane: "M0", label: "SIGURG" },
          { t: 22, lane: "M0", label: "SIGURG" },
        ],
      },
    },
    frames: [
      {
        trace: "old",
        t: 10,
        h: "Go 1.13: preempt flag set",
        b: "sysmon sees G1 has run past 10 ms and sets its preempt flag.",
        q: { P0: ["G2", "G3"], global: [] },
      },
      {
        trace: "old",
        t: 12,
        h: "Go 1.13: G1 never yields",
        b: "The flag is only checked in function prologues, and this loop calls nothing.",
        q: { P0: ["G2", "G3"], global: [] },
      },
      {
        trace: "old",
        t: 40,
        h: "Everything else starves",
        b: "G2 and G3 wait indefinitely. A garbage collection that needs to stop the world waits for G1 too, so the whole program can hang.",
        q: { P0: ["G2", "G3"], global: [] },
      },
      {
        trace: "neu",
        t: 10,
        h: "Go 1.14+: G1 still running",
        b: "G1 has occupied P0 for 10 ms without yielding.",
        q: { P0: ["G2", "G3"], global: [] },
      },
      {
        trace: "neu",
        t: 10.5,
        h: "Go 1.14+: sysmon sends SIGURG",
        b: "After about 10 ms, sysmon signals M0. The handler checks G1 is at a safe point, saves its state, and preempts it. G1 goes to the global queue; G2 runs.",
        q: { P0: ["G3"], global: ["G1"] },
      },
      {
        trace: "neu",
        t: 12,
        h: "G2 runs",
        b: "G2 gets a short slice on P0.",
        q: { P0: ["G3"], global: ["G1"] },
      },
      {
        trace: "neu",
        t: 22,
        h: "G1 runs again",
        b: "G1 returns to the processor after G2's slice.",
        q: { P0: ["G3"], global: [] },
      },
      {
        trace: "neu",
        t: 22.5,
        h: "Second SIGURG",
        b: "Another long stretch triggers preemption again.",
        q: { P0: [], global: ["G1"] },
      },
      {
        trace: "neu",
        t: 24.5,
        h: "Fair slices",
        b: "G1, G2, G1, G3: each long run is cut at roughly 10–20 ms. Coarse, but no goroutine can hold a P forever. asyncio has no equivalent.",
        q: { P0: [], global: [] },
      },
    ],
    take: "Go is preemptive for CPU-bound goroutines since 1.14. Slices are coarse (about 10 ms), so a latency-sensitive goroutine can still wait that long behind a CPU hog.",
    gen: "Cooperative vs preemptive scheduling everywhere: OS kernels use timer interrupts, the BEAM VM counts reductions, asyncio has no preemption at all.",
  },
];
