import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");
const html = readFileSync(join(root, "content/Visualizer/Inside Celery Prefetch.html"), "utf8");
const helperStart = html.indexOf("const K=id=>");
const scStart = html.indexOf("const SC=");
const end = html.indexOf("let si=0", scStart);
const code = `${html.slice(helperStart, scStart)}${html.slice(scStart, end)}\n({ SC });`;
const { SC } = vm.runInNewContext(code, {});

writeFileSync(
  join(root, "lib/visualizer/celery-prefetch/scenarios.data.json"),
  JSON.stringify({ scenarios: SC }, null, 2),
);
console.log(SC.map((s) => [s.id, s.frames.length]));
