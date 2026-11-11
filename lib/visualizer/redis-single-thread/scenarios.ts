import type { RedisScenario } from "./types";

export const REDIS_SINGLE_THREAD_SCENARIOS: RedisScenario[] = [
  {
    id: "happy",
    tab: "Happy path",
    short: "Microsecond commands",
    q: "One thread serves everyone, because each command takes about a microsecond",
    traces: {
      main: {
        max: 240,
        unit: "µs",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 100, type: "io", label: "GET on the wire" },
              { s: 100, e: 101, type: "run", label: "GET" },
              { s: 101, e: 201, type: "io", label: "reply on the wire" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 10, e: 110, type: "io", label: "SET on the wire" },
              { s: 110, e: 111, type: "run", label: "SET" },
              { s: 111, e: 211, type: "io", label: "reply on the wire" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 20, e: 120, type: "io", label: "GET on the wire" },
              { s: 120, e: 121, type: "run", label: "GET" },
              { s: 121, e: 221, type: "io", label: "reply on the wire" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        t: 10,
        h: "B starts on the wire",
        b: "B's SET arrives while A is still waiting on the network.",
      },
      {
        t: 20,
        h: "C starts on the wire",
        b: "C's GET begins while A and B are still on the network.",
      },
      {
        t: 100,
        h: "A's socket is readable",
        b: "epoll reports A's socket readable.",
      },
      {
        t: 100.5,
        h: "A's request arrives",
        b: "Redis reads and parses the command, then runs <code>GET user:42</code> against the in-memory hash table: about 1 µs.",
      },
      {
        t: 101,
        h: "A runs GET",
        b: "The main thread executes A's GET in about a microsecond.",
      },
      {
        t: 110,
        h: "B's command is ready",
        b: "B's SET is parsed next.",
      },
      {
        t: 111,
        h: "B's SET runs",
        b: "A's reply is on the wire; B's command executes next.",
      },
      {
        t: 120,
        h: "C's command is ready",
        b: "C's GET is parsed after B's SET.",
      },
      {
        t: 121,
        h: "B and C, one after another",
        b: "Each command runs to completion before the next starts. Nobody waits more than a microsecond or two, so the Main row is almost empty.",
      },
      {
        t: 221,
        h: "C's reply on the wire",
        b: "C finishes; all three clients are back on network I/O.",
      },
      {
        t: 240,
        h: "Idle most of the time",
        b: "Each request spends about 100 µs on the network for 1 µs of work. One thread can serve hundreds of thousands of commands per second, with no locks on any data structure.",
      },
    ],
    take: "Single-threaded execution is a design choice: no locks, and every command is atomic. It works because commands are tiny and the data is in memory.",
    gen: "The asyncio and Node.js event loops: one thread, non-blocking I/O, and everything depends on keeping each unit of work short.",
  },
  {
    id: "slow",
    tab: "Scenario 1",
    short: "KEYS * and big DEL",
    q: "One KEYS * or a big DEL. Why does every client stall?",
    traces: {
      keys: {
        max: 20,
        unit: "ms",
        label: "KEYS user:* on 10 million keys",
        lanes: [
          {
            id: "A",
            segs: [{ s: 1, e: 15, type: "run", label: "KEYS user:*  · walks 10M keys" }],
          },
          {
            id: "B",
            segs: [
              { s: 0, e: 0.2, type: "run", label: "GET" },
              { s: 2, e: 15, type: "wait", label: "GET queued" },
              { s: 15, e: 15.2, type: "run", label: "GET" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 4, e: 15.2, type: "wait", label: "GET queued" },
              { s: 15.2, e: 15.4, type: "run", label: "GET" },
            ],
          },
        ],
      },
      scan: {
        max: 20,
        unit: "ms",
        label: "SCAN 0 MATCH user:* COUNT 1000, in batches",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 1, e: 3, type: "run", label: "SCAN" },
              { s: 3, e: 4, type: "io" },
              { s: 4, e: 6, type: "run", label: "SCAN" },
              { s: 6, e: 7, type: "io" },
              { s: 7, e: 9, type: "run", label: "SCAN" },
              { s: 9, e: 10, type: "io" },
              { s: 10, e: 12, type: "run", label: "SCAN" },
              { s: 12, e: 13, type: "io" },
              { s: 13, e: 15, type: "run", label: "SCAN" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 0, e: 0.2, type: "run", label: "GET" },
              { s: 2, e: 3, type: "wait" },
              { s: 3, e: 3.2, type: "run", label: "GET" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 4, e: 6, type: "wait" },
              { s: 6, e: 6.2, type: "run", label: "GET" },
            ],
          },
        ],
      },
      del: {
        max: 20,
        unit: "ms",
        label: "DEL on a set with 5 million members",
        lanes: [
          {
            id: "D",
            segs: [{ s: 1, e: 10, type: "run", label: "DEL bigset · frees 5M members" }],
          },
          {
            id: "B",
            segs: [
              { s: 2, e: 10, type: "wait", label: "GET queued" },
              { s: 10, e: 10.2, type: "run", label: "GET" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 4, e: 10.2, type: "wait", label: "GET queued" },
              { s: 10.2, e: 10.4, type: "run", label: "GET" },
            ],
          },
        ],
      },
      unlink: {
        max: 20,
        unit: "ms",
        label: "UNLINK bigset",
        lanes: [
          {
            id: "D",
            segs: [{ s: 1, e: 1.2, type: "run", label: "UNLINK" }],
          },
          {
            id: "lazyfree",
            name: "lazyfree",
            segs: [{ s: 1.2, e: 10, type: "thr", label: "background thread frees 5M members" }],
          },
          {
            id: "B",
            segs: [{ s: 2, e: 2.2, type: "run", label: "GET" }],
          },
          {
            id: "C",
            segs: [{ s: 4, e: 4.2, type: "run", label: "GET" }],
          },
        ],
      },
    },
    frames: [
      { trace: "keys", t: 0.2, h: "B fires a GET", b: "B's fast GET lands before KEYS starts." },
      {
        trace: "keys",
        t: 1,
        h: "KEYS starts",
        b: "A begins walking the whole keyspace on the main thread.",
      },
      { trace: "keys", t: 2, h: "B queued", b: "B's GET waits behind KEYS." },
      { trace: "keys", t: 4, h: "C queued", b: "C arrives and waits too." },
      {
        trace: "keys",
        t: 9,
        h: "KEYS walks the whole keyspace",
        b: "<code>KEYS user:*</code> visits all 10 million keys on the main thread. B and C send 1 µs <code>GET</code>s and wait behind it.",
      },
      { trace: "keys", t: 15, h: "KEYS finishes", b: "The walk completes; queued GETs can run." },
      { trace: "keys", t: 15.2, h: "B runs", b: "B's GET executes." },
      { trace: "keys", t: 15.4, h: "C runs", b: "C's GET executes last." },
      {
        trace: "keys",
        t: 16,
        h: "Everyone paid for it",
        b: "B and C finally run when KEYS finishes. Their latency was set by somebody else's command; with client timeouts they would have failed. <code>SLOWLOG GET</code> shows the culprit.",
      },
      { trace: "scan", t: 0.2, h: "B's GET", b: "Same clients; A will SCAN in batches." },
      {
        trace: "scan",
        t: 1,
        h: "SCAN batch 1",
        b: "The same work is split into small SCAN batches.",
      },
      { trace: "scan", t: 2, h: "B waits", b: "B waits during batch 1." },
      { trace: "scan", t: 3, h: "I/O gap", b: "A yields the main thread between batches." },
      { trace: "scan", t: 3.2, h: "B runs", b: "B's GET slips in while A waits on I/O." },
      { trace: "scan", t: 4, h: "Next batch starts", b: "A resumes SCAN." },
      { trace: "scan", t: 6, h: "Another gap", b: "Another I/O window opens." },
      { trace: "scan", t: 6.2, h: "C runs", b: "C's GET runs during the gap." },
      { trace: "scan", t: 7, h: "Batch 3", b: "SCAN continues." },
      { trace: "scan", t: 9, h: "Batch 4 prep", b: "More batches, more gaps." },
      { trace: "scan", t: 10, h: "I/O", b: "Network between batches." },
      { trace: "scan", t: 12, h: "Scan work", b: "Main thread busy on SCAN again." },
      { trace: "scan", t: 13, h: "I/O", b: "Another handoff to the network." },
      { trace: "scan", t: 15, h: "Last batch", b: "Final SCAN batch completes." },
      {
        trace: "scan",
        t: 16,
        h: "Fix: SCAN in batches",
        b: "<code>SCAN</code> returns a small batch plus a cursor. Between batches, B and C run straight away. The total work is the same; the stall is gone.",
      },
      { trace: "del", t: 1, h: "DEL starts", b: "A big DELETE runs entirely on the main thread." },
      { trace: "del", t: 2, h: "B queued", b: "B waits on DEL." },
      { trace: "del", t: 4, h: "C queued", b: "C waits too." },
      { trace: "del", t: 10, h: "DEL still running", b: "Everyone stays queued." },
      { trace: "del", t: 10.2, h: "B runs", b: "DEL completes; B runs." },
      { trace: "del", t: 10.4, h: "C runs", b: "C runs last." },
      {
        trace: "del",
        t: 11,
        h: "A big DEL blocks the same way",
        b: "Freeing 5 million set members happens on the main thread, so every client waits again.",
      },
      { trace: "unlink", t: 1, h: "UNLINK starts", b: "D drops the key from the keyspace." },
      { trace: "unlink", t: 1.2, h: "UNLINK returns", b: "The key is gone immediately." },
      { trace: "unlink", t: 2, h: "lazyfree starts", b: "A background thread frees memory." },
      {
        trace: "unlink",
        t: 2.2,
        h: "B's GET runs",
        b: "The main thread is free while lazyfree works.",
      },
      { trace: "unlink", t: 4, h: "C's GET", b: "C runs while lazyfree continues." },
      { trace: "unlink", t: 4.2, h: "C done", b: "Both clients finish before lazyfree does." },
      { trace: "unlink", t: 10, h: "lazyfree finishes", b: "Background free completes." },
      {
        trace: "unlink",
        t: 11,
        h: "Fix: UNLINK",
        b: "The key leaves the keyspace immediately and a background thread frees the memory. <code>lazyfree-lazy-user-del yes</code> makes DEL behave like this.",
      },
    ],
    take: "In Redis the cost of a command is paid by every client. In production use SCAN, HSCAN and SSCAN instead of KEYS, HGETALL and SMEMBERS on big collections, and UNLINK instead of DEL for big keys. Long Lua scripts block the same way.",
    gen: "The blocking call in the asyncio visualizer: the same shape and the same fix, break the work up or move it off the thread.",
  },
  {
    id: "iothreads",
    tab: "Scenario 2",
    short: "I/O threads",
    q: "Redis has I/O threads now. Why is execution still single-threaded?",
    traces: {
      noio: {
        max: 28,
        unit: "µs",
        label: "io-threads 1 (default): main thread does all the I/O",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 3, type: "run", label: "read" },
              { s: 3, e: 4, type: "run", label: "exec" },
              { s: 4, e: 6, type: "run", label: "write" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 0, e: 6, type: "wait" },
              { s: 6, e: 9, type: "run", label: "read" },
              { s: 9, e: 10, type: "run", label: "exec" },
              { s: 10, e: 12, type: "run", label: "write" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 0, e: 12, type: "wait", label: "waiting" },
              { s: 12, e: 15, type: "run", label: "read" },
              { s: 15, e: 16, type: "run", label: "exec" },
              { s: 16, e: 18, type: "run", label: "write" },
            ],
          },
          {
            id: "D",
            segs: [
              { s: 0, e: 18, type: "wait", label: "waiting" },
              { s: 18, e: 21, type: "run", label: "read" },
              { s: 21, e: 22, type: "run", label: "exec" },
              { s: 22, e: 24, type: "run", label: "write" },
            ],
          },
        ],
      },
      io: {
        max: 28,
        unit: "µs",
        label: "io-threads 4: reads and writes in parallel, execution serial",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 4, type: "run" },
              { s: 4, e: 6, type: "thr", label: "write" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 4, type: "wait" },
              { s: 4, e: 5, type: "run" },
              { s: 5, e: 7, type: "thr", label: "write" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 5, type: "wait" },
              { s: 5, e: 6, type: "run" },
              { s: 6, e: 8, type: "thr", label: "write" },
            ],
          },
          {
            id: "D",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 6, type: "wait" },
              { s: 6, e: 7, type: "run" },
              { s: 7, e: 9, type: "thr", label: "write" },
            ],
          },
        ],
      },
      iokeys: {
        max: 28,
        unit: "µs",
        label: "io-threads 4, but A runs a slow command",
        lanes: [
          {
            id: "A",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 22, type: "run", label: "slow command (KEYS, big DEL…)" },
              { s: 22, e: 24, type: "thr", label: "write" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 22, type: "wait", label: "queued" },
              { s: 22, e: 23, type: "run", label: "exec" },
              { s: 23, e: 25, type: "thr", label: "write" },
            ],
          },
          {
            id: "C",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 23, type: "wait", label: "queued" },
              { s: 23, e: 24, type: "run", label: "exec" },
              { s: 24, e: 26, type: "thr", label: "write" },
            ],
          },
          {
            id: "D",
            segs: [
              { s: 0, e: 3, type: "thr", label: "read" },
              { s: 3, e: 24, type: "wait", label: "queued" },
              { s: 24, e: 25, type: "run", label: "exec" },
              { s: 25, e: 27, type: "thr", label: "write" },
            ],
          },
        ],
      },
    },
    frames: [
      {
        trace: "noio",
        t: 3,
        h: "A reads",
        b: "Without I/O threads, A handles read on the main thread.",
      },
      { trace: "noio", t: 4, h: "A executes", b: "Short exec slice, then write." },
      {
        trace: "noio",
        t: 6,
        h: "B waits",
        b: "B could not start until A finishes read, exec, and write.",
      },
      { trace: "noio", t: 9, h: "B mid-flight", b: "B is on read/exec/write while C waits." },
      { trace: "noio", t: 12, h: "C starts", b: "C finally leaves the wait queue." },
      { trace: "noio", t: 18, h: "D still waiting", b: "D waited through A, B, and most of C." },
      {
        trace: "noio",
        t: 24,
        h: "Without I/O threads",
        b: "For each command the main thread reads the socket, parses, executes (the short middle part) and writes the reply. Most of its time goes to I/O, not commands.",
      },
      {
        trace: "io",
        t: 3,
        h: "Parallel reads",
        b: "I/O threads read sockets in parallel while the main thread is idle.",
      },
      {
        trace: "io",
        t: 4,
        h: "A executes",
        b: "Commands still run one at a time on the main thread.",
      },
      { trace: "io", t: 5, h: "A writes off-thread", b: "Reply write moves to an I/O thread." },
      { trace: "io", t: 6, h: "B executes", b: "B runs on the main thread." },
      { trace: "io", t: 7, h: "B writes", b: "Another parallel write." },
      {
        trace: "io",
        t: 9,
        h: "With I/O threads",
        b: "The same four commands finish in 9 µs instead of 24.",
      },
      {
        trace: "iokeys",
        t: 3,
        h: "A starts slow command",
        b: "I/O threads do not help if execution blocks everyone.",
      },
      {
        trace: "iokeys",
        t: 22,
        h: "B still queued",
        b: "B waited through A's entire slow command.",
      },
      { trace: "iokeys", t: 23, h: "B runs", b: "B finally executes." },
      { trace: "iokeys", t: 24, h: "C runs", b: "C follows B." },
      { trace: "iokeys", t: 25, h: "D runs", b: "D is last." },
      {
        trace: "iokeys",
        t: 27,
        h: "Execution is still serial",
        b: "The Main row still runs one command at a time. A slow command blocks every client exactly as in scenario 1, with or without I/O threads.",
      },
    ],
    take: "I/O threads scale the networking, not the data-structure work. To scale execution, run more Redis processes: Redis Cluster shards the keyspace across them.",
    gen: "The split of network I/O from execution in nginx workers and Netty, and the netpoller in the Go visualizer. Redis 8 and Valkey 8 reworked I/O threading but kept execution on one thread.",
  },
  {
    id: "fork",
    tab: "Scenario 3",
    short: "BGSAVE and fork",
    q: "A background save forks the process. Why do latency and memory spike?",
    traces: {
      main: {
        max: 420,
        unit: "ms",
        label: "24 GB dataset, steady writes, BGSAVE starts",
        lanes: [
          {
            id: "save",
            name: "BGSAVE",
            segs: [{ s: 10, e: 250, type: "run", label: "fork(): copy ~48 MB of page tables" }],
          },
          {
            id: "A",
            segs: [
              { s: 0, e: 1, type: "run", label: "SET" },
              { s: 20, e: 250, type: "wait", label: "SET queued" },
              { s: 250, e: 251, type: "run", label: "SET" },
              { s: 300, e: 301, type: "run", label: "SET" },
              { s: 350, e: 351, type: "run", label: "SET" },
            ],
          },
          {
            id: "B",
            segs: [
              { s: 5, e: 6, type: "run", label: "GET" },
              { s: 60, e: 250, type: "wait", label: "GET queued" },
              { s: 251, e: 252, type: "run", label: "GET" },
              { s: 320, e: 321, type: "run", label: "GET" },
              { s: 380, e: 381, type: "run", label: "GET" },
            ],
          },
          {
            id: "child",
            name: "child",
            segs: [{ s: 250, e: 420, type: "thr", label: "child process writes the RDB snapshot" }],
          },
        ],
      },
    },
    frames: [
      { t: 1, h: "Steady traffic", b: "Clients run SET and GET as usual before BGSAVE." },
      { t: 5, h: "B's GET", b: "B runs a quick GET before the save." },
      { t: 6, h: "B done", b: "Traffic continues." },
      {
        t: 9,
        info: "memory: 24.0 GB",
        h: "Before the save",
        b: "Redis is about to start a background save (BGSAVE, or an AOF rewrite).",
      },
      { t: 10, h: "BGSAVE queued", b: "fork() is imminent." },
      { t: 20, h: "A's SET queued", b: "A's SET waits behind the upcoming fork." },
      { t: 60, h: "B queues", b: "B's GET waits while the server prepares to fork." },
      {
        t: 250,
        info: "memory: 24.0 GB · main thread blocked ~240 ms",
        h: "fork() blocks the main thread",
        b: "Data isn't copied, but page tables are: about 48 MB of them for 24 GB in 4 KB pages. Measured at roughly 10 ms per GB on bare metal, and over 200 ms per GB on some virtual machines. Every client waits.",
      },
      { t: 251, h: "fork() returns", b: "The child process starts the snapshot." },
      { t: 252, h: "B's GET runs", b: "B resumes after the pause." },
      { t: 300, h: "Copy-on-write begins", b: "Parent writes start duplicating 4 KB pages." },
      { t: 301, h: "A writes", b: "A SET after fork triggers COW." },
      { t: 320, h: "B writes", b: "Another page may copy." },
      { t: 321, h: "B's GET completes", b: "B's post-fork GET finishes." },
      {
        t: 330,
        info: "memory: 24.0 GB shared + 1.2 GB copied pages (4 KB pages)",
        h: "Copy-on-write",
        b: "Parent and child share memory. When the parent writes a key, the kernel first copies the 4 KB page it lives on. Memory grows with the number of distinct pages written during the save.",
      },
      {
        t: 330,
        info: "memory: 24.0 GB shared + 11 GB copied pages (2 MB huge pages)",
        bad: true,
        h: "With transparent huge pages",
        b: "The copy unit becomes 2 MB, 512 times larger. Small writes duplicate whole huge pages, and memory can approach double, risking an OOM kill. Redis recommends disabling THP.",
      },
      { t: 350, h: "More parent writes", b: "Each write can copy another page during the save." },
      { t: 351, h: "A SET completes", b: "Another write while the child snapshots." },
      { t: 380, h: "B reads", b: "Reads may still copy if pages were never written." },
      { t: 381, h: "Snapshot winding down", b: "Child is still writing the RDB." },
      {
        t: 420,
        info: "memory: back to 24.0 GB",
        h: "The child finishes",
        b: "The snapshot is on disk, the child exits, and the copied pages are freed. <code>INFO</code> reports the fork cost as <code>latest_fork_usec</code>.",
      },
    ],
    take: "Leave memory headroom for snapshots, disable transparent huge pages, watch latest_fork_usec, and keep per-instance datasets moderate: fork cost grows with dataset size.",
    gen: "Any process that forks to take a consistent snapshot of its own memory, and copy-on-write snapshots in file systems such as ZFS and Btrfs.",
  },
];
