import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");
const html = readFileSync(join(root, "content/Visualizer/Inside DNS Caching.html"), "utf8");
const start = html.indexOf("const KC=");
const end = html.indexOf("const LEG=", start);
const code = `${html.slice(start, end)}\n({ SC });`;
const { SC } = vm.runInNewContext(code, {});

writeFileSync(
  join(root, "lib/visualizer/dns-caching/scenarios.data.json"),
  JSON.stringify({ scenarios: SC }, null, 2),
);
console.log(SC.map((s) => [s.id, s.frames.length]));
