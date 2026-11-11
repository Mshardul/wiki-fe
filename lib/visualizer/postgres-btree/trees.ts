import type { BtreeHighlight, BtreeTreeDef } from "@/lib/visualizer/core/shapes";

export const BTREE_TREES: Record<string, BtreeTreeDef> = {
  cust: {
    name: "orders (customer_id, order_date)",
    root: "< 501 | ≥ 501",
    ints: ["customers 1 – 500", "501 – 50,000"],
    leaves: [
      ["1 · 11-01", "3 · 11-01", "41 · 11-01"],
      ["42 · 09-02", "42 · 10-29", "42 · 11-01"],
      ["43 · 11-01", "44 · 06-18", "45 · 11-01"],
      ["501 · 11-01", "502 · 10-03", "503 · 11-02"],
      ["20,113 · 11-01", "20,114 · 08-30", "20,115 · 11-01"],
      ["49,998 · 11-01", "49,999 · 07-14", "50,000 · 11-01"],
    ],
  },
  status: {
    name: "orders (status, order_date)",
    root: "< pending | ≥ pending",
    ints: ["cancelled – paid", "pending – shipped"],
    leaves: [
      ["cancelled · 10-31", "cancelled · 11-01", "cancelled · 11-03"],
      ["paid · 10-30", "paid · 11-01", "paid · 11-01"],
      ["paid · 11-02", "paid · 11-05", "paid · 11-07"],
      ["pending · 10-29", "pending · 11-01", "pending · 11-02"],
      ["shipped · 10-28", "shipped · 11-01", "shipped · 11-01"],
      ["shipped · 11-03", "shipped · 11-04", "shipped · 11-06"],
    ],
  },
  date: {
    name: "orders (order_date, customer_id)",
    root: "< 10-30 | ≥ 10-30",
    ints: ["… – 10-29", "10-30 – …"],
    leaves: [
      ["07-14 · 49,999", "08-30 · 20,114", "09-02 · 42"],
      ["09-15 · 7", "10-02 · 3", "10-12 · 44"],
      ["10-15 · 9", "10-20 · 2", "10-29 · 42"],
      ["10-30 · 18", "10-31 · 6", "11-01 · 1"],
      ["11-01 · 3", "11-01 · 39", "11-01 · 41"],
      ["11-01 · 42", "11-02 · 503", "11-05 · 12"],
    ],
  },
  email: {
    name: "users (email) · sorted by raw value",
    root: "< alex | ≥ alex",
    ints: ["A – Z (uppercase sorts first)", "a – z"],
    leaves: [
      ["Alice@x.com", "BOB@x.com", "Bob@y.com"],
      ["Carol@z.com", "DAVE@q.com", "Erin@x.com"],
      ["Pat@q.com", "Sam@x.com", "Zoe@x.com"],
      ["alex@m.com", "alice@y.com", "bob@q.com"],
      ["carol@x.com", "dan@x.com", "erin@y.com"],
      ["mike@x.com", "ravi@x.com", "zed@x.com"],
    ],
  },
  lower: {
    name: "users (lower(email))",
    root: "< dave | ≥ dave",
    ints: ["alex – dan", "dave – zoe"],
    leaves: [
      ["alex@m.com", "alice@x.com", "alice@y.com"],
      ["bob@q.com", "bob@x.com", "bob@y.com"],
      ["carol@x.com", "carol@z.com", "dan@x.com"],
      ["dave@q.com", "erin@x.com", "erin@y.com"],
      ["mike@x.com", "pat@q.com", "ravi@x.com"],
      ["sam@x.com", "zed@x.com", "zoe@x.com"],
    ],
  },
  incl: {
    name: "orders (customer_id) INCLUDE (total)",
    root: "< 501 | ≥ 501",
    ints: ["customers 1 – 500", "501 – 50,000"],
    leaves: [
      ["1 · total 40", "3 · total 12", "41 · total 99"],
      ["42 · total 120", "42 · total 75", "42 · total 310"],
      ["43 · total 18", "44 · total 64", "45 · total 22"],
      ["501 · total 8", "502 · total 51", "503 · total 30"],
      ["20,113 · total 77", "20,114 · total 15", "20,115 · total 90"],
      ["49,998 · total 5", "49,999 · total 63", "50,000 · total 41"],
    ],
  },
};

export const ALL_DATE_HIGHLIGHT: BtreeHighlight = {
  l0: [0, 1, 2],
  l1: [2],
  l2: [0, 2],
  l3: [0],
  l4: [0, 2],
  l5: [0, 2],
};
