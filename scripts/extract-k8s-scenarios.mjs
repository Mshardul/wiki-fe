import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");

function sliceScript(html, startMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`missing ${startMarker}`);
  const end = html.indexOf("const $=id=>", start);
  if (end < 0) throw new Error("missing end marker");
  return html.slice(start, end);
}

function runKubectl() {
  const html = readFileSync(
    join(root, "content/Visualizer/Inside kubectl apply.html"),
    "utf8",
  );
  const code = `${sliceScript(html, "const ACTORS=")}\n({ ACTORS, SC });`;
  return vm.runInNewContext(code, {});
}

function runService() {
  const html = readFileSync(
    join(root, "content/Visualizer/Inside a Kubernetes Service.html"),
    "utf8",
  );
  const code = `${sliceScript(html, "const E=")}\n({ SC });`;
  return vm.runInNewContext(code, {});
}

const kubectl = runKubectl();
const service = runService();

writeFileSync(
  join(root, "lib/visualizer/kubectl-apply/scenarios.data.json"),
  JSON.stringify({ actors: kubectl.ACTORS, scenarios: kubectl.SC }, null, 2),
);
writeFileSync(
  join(root, "lib/visualizer/kubernetes-service/scenarios.data.json"),
  JSON.stringify({ scenarios: service.SC }, null, 2),
);

console.log(
  "kubectl scenarios",
  kubectl.SC.map((s) => [s.id, s.frames.length]),
);
console.log(
  "service scenarios",
  service.SC.map((s) => [s.id, s.frames.length]),
);
