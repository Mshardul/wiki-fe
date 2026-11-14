import type { Experiment } from "../core/types";
import type { GraphId } from "./types";

export interface GraphCopy {
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  metricLabel: string;
  summary: string;
  differs: string;
}

export const COPY: Record<GraphId, GraphCopy> = {
  bfs: {
    name: "BFS",
    chip: "Queue",
    rule: "Visit the nearest nodes first, level by level.",
    lines: [
      "Take the node at the front of the queue.",
      "Look at each of its neighbours.",
      "Queue every neighbour not seen yet.",
      "Repeat until the queue is empty.",
    ],
    about: [
      ["Cost", "O(V + E): every node is queued once and every edge is looked at from both ends."],
      ["Wins", "Fewest hops in an unweighted graph, and anything level by level."],
      ["Loses", "Holds a whole level in memory, and ignores edge weights."],
      ["Seen in", "Shortest path in a maze, word ladders, distance in a social network."],
    ],
    tries: [
      {
        title: "Start in the middle",
        blurb: "The rows now count hops from E.",
        patch: { start: "E" },
      },
      {
        title: "Follow arrows",
        blurb: "On a directed graph, A, B and D can never be reached from C.",
        patch: { preset: "dag", start: "C" },
      },
    ],
    articleHref: "/dsa/algorithms/bfs/",
    metricLabel: "Visited",
    summary: "Queues the neighbours of each node, so closer nodes are always visited first.",
    differs: "Level by level, so the first time it reaches a node is by the fewest hops.",
  },
  dfs: {
    name: "DFS",
    chip: "Stack",
    rule: "Go as deep as you can, then back up.",
    lines: [
      "Visit a node and put it on the stack.",
      "Go to its first neighbour not seen yet.",
      "When none is left, pop the node and go back.",
    ],
    about: [
      ["Cost", "O(V + E) time, and the stack holds at most one path."],
      ["Wins", "Exploring every path, cycles, components and backtracking."],
      ["Loses", "Does not find shortest paths, and a deep graph needs an explicit stack."],
      ["Seen in", "Maze solving, connected components, counting islands, topological order."],
    ],
    tries: [
      {
        title: "Other start",
        blurb: "A different start gives a different visiting order.",
        patch: { start: "H" },
      },
      {
        title: "Shuffle neighbours",
        blurb: "The order changes when neighbours are tried differently.",
        patch: { seed: 7 },
      },
    ],
    articleHref: "/dsa/algorithms/dfs/",
    metricLabel: "Visited",
    summary: "Dives down one path as far as it goes, then backs up one step at a time.",
    differs:
      "Dives down one path, then backs up; the order depends on which neighbour comes first.",
  },
  dijkstra: {
    name: "Dijkstra",
    chip: "Priority queue",
    rule: "Always finish the closest unfinished node, then try routes through it.",
    lines: [
      "Pop the closest unfinished node.",
      "For each neighbour, try the route through this node.",
      "If it is shorter, update the distance and push it.",
      "Skip entries that are out of date.",
    ],
    about: [
      ["Cost", "O((V + E) log V) with a heap."],
      ["Wins", "Shortest paths when every edge has a weight of zero or more."],
      ["Loses", "Wrong with negative weights, and slower than BFS when all edges are equal."],
      ["Seen in", "Maps and routing, network latency, game pathfinding."],
    ],
    tries: [
      {
        title: "Shuffle neighbours",
        blurb: "Same distances, different order of work.",
        patch: { seed: 7 },
      },
      {
        title: "Start at E",
        blurb: "Distances are measured from E instead.",
        patch: { start: "E" },
      },
    ],
    articleHref: "/dsa/algorithms/dijkstra/",
    metricLabel: "Relaxations",
    summary: "Pops the closest node from a priority queue and shortens its neighbours' distances.",
    differs: "Like BFS but ordered by total cost, so a longer path can win.",
  },
  topo: {
    name: "Topological sort",
    chip: "Ready list",
    rule: "Take a node only after everything it depends on is taken.",
    lines: [
      "Count the arrows pointing into each node.",
      "Nodes with none go in the ready list.",
      "Take one, add it to the output and remove its arrows.",
      "A node that reaches zero becomes ready.",
    ],
    about: [
      ["Cost", "O(V + E): every node and every arrow is handled once."],
      ["Wins", "Orders tasks that depend on each other, and spots a cycle for free."],
      ["Loses", "Only for directed graphs, and the order is not unique."],
      ["Seen in", "Build systems, course prerequisites, task schedulers."],
    ],
    tries: [
      {
        title: "Add a cycle",
        blurb: "An arrow back from F to C leaves three nodes that never become ready.",
        patch: { preset: "dag-cycle" },
      },
      {
        title: "Shuffle edge order",
        blurb: "Arrows are removed in a different order; the result is still valid.",
        patch: { seed: 7 },
      },
    ],
    articleHref: "/dsa/algorithms/topological-sort/",
    metricLabel: "In output",
    summary: "Repeatedly takes a node with no arrows left pointing at it.",
    differs: "Only for arrows with no cycle; it stops when nothing is ready.",
  },
  bipartite: {
    name: "Bipartite check",
    chip: "Two colours",
    rule: "Colour a node, then give every neighbour the opposite colour.",
    lines: [
      "Give the start node a colour.",
      "Give each unseen neighbour the opposite colour.",
      "If a neighbour has the same colour, stop: no two-colouring exists.",
    ],
    about: [
      ["Cost", "O(V + E): a BFS that also colours."],
      ["Wins", "Splits nodes into two groups with no edge inside a group, or finds an odd cycle."],
      ["Loses", "Answers only for two groups; three or more colours is much harder."],
      ["Seen in", "Matching, scheduling conflicts, and two-colourable graph questions."],
    ],
    tries: [
      {
        title: "Odd ring",
        blurb: "Five nodes in a ring cannot be split in two.",
        patch: { preset: "ring-odd" },
      },
      {
        title: "Even ring",
        blurb: "Six nodes in a ring split cleanly.",
        patch: { preset: "ring-even" },
      },
    ],
    articleHref: "/dsa/patterns/graph-coloring/",
    metricLabel: "Coloured",
    summary: "Colours level by level; a neighbour with the same colour proves an odd cycle.",
    differs: "A BFS that colours; one same-colour edge proves an odd cycle.",
  },
};
