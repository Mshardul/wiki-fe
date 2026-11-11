import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");
const html = readFileSync(
  join(root, "content/Visualizer/The Cost of a New Connection.html"),
  "utf8",
);
const start = html.indexOf("const KC=");
const scStart = html.indexOf("const SC=", start);
const end = html.indexOf("let si=0", scStart);
const code = `${html.slice(start, end)}\n({ SC });`;
const { SC } = vm.runInNewContext(code, {});

writeFileSync(
  join(root, "lib/visualizer/connection-cost/scenarios.data.json"),
  JSON.stringify({ scenarios: SC }, null, 2),
);
console.log(SC.map((s) => [s.id, s.frames.length]));
