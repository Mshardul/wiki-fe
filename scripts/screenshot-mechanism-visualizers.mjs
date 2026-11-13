/**
 * Full-page PNG screenshots for every mechanism visualizer scenario tab.
 *
 *   pnpm build && make screenshot-mechanism-visualizers
 *   make screenshot-mechanism-visualizers ARGS=--no-build
 *
 * Output: screenshots/visualizer-runs/<unix-seconds>/{slug}/{nn}-{tab}.png
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import { startServeOut } from "./lib/serve-out.mjs";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "out");
const MANIFEST_PATH = join(
  REPO_ROOT,
  "lib/visualizer/mechanism/manifest.json",
);

/** App layout uses 100dvh + inner scroll on `.viz-mech`; undo for capture. */
const EXPAND_FOR_SCREENSHOT_JS = `
(() => {
  const id = "wiki-screenshot-expand";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = \`
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .viz-page {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .viz-mech {
      flex: none !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
  \`;
  document.head.appendChild(s);
})();
`;

const NO_ANIMATIONS_JS = `
(() => {
  const s = document.createElement("style");
  s.textContent =
    "*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; transition-delay: 0s !important; animation-delay: 0s !important; }";
  if (document.head) {
    document.head.appendChild(s);
  } else {
    document.addEventListener("DOMContentLoaded", () =>
      document.head.appendChild(s),
    );
  }
})();
`;

function parseArgs(argv) {
  const opts = { build: true, baseUrl: process.env.WIKI_BASE_URL ?? "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-build") opts.build = false;
    else if (a === "--base-url" && argv[i + 1]) {
      opts.baseUrl = argv[++i];
    }
  }
  return opts;
}

function slugifyLabel(label) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tab"
  );
}

function ensureBuild() {
  if (existsIndex()) return;
  const r = spawnSync("pnpm", ["build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function existsIndex() {
  try {
    readFileSync(join(OUT_DIR, "index.html"));
    return true;
  } catch {
    return false;
  }
}

async function waitMechanismReady(page) {
  await page.waitForSelector("html[data-hotkeys-ready]", {
    state: "attached",
    timeout: 20_000,
  });
  await page.waitForSelector(".viz-mech__stepwrap > .viz-mech__step h3", {
    timeout: 20_000,
  });
  await page.waitForSelector(".viz-mech__stage > *", { timeout: 20_000 });
}

async function prepareFullPageCapture(page) {
  await page.evaluate(EXPAND_FOR_SCREENSHOT_JS);
  await page.evaluate(() => {
    const mech = document.querySelector(".viz-mech");
    if (mech) mech.scrollTop = 0;
    window.scrollTo(0, 0);
  });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const slugs = Object.keys(manifest.slugs).sort();

  const runId = String(Math.floor(Date.now() / 1000));
  const runDir = join(REPO_ROOT, "screenshots", "visualizer-runs", runId);
  mkdirSync(runDir, { recursive: true });

  let baseUrl = opts.baseUrl;
  /** @type {(() => Promise<void>) | null} */
  let stopServer = null;

  if (!baseUrl) {
    if (opts.build) ensureBuild();
    if (!existsIndex()) {
      console.error(
        "Missing out/index.html — run `pnpm build` first or pass --base-url.",
      );
      process.exit(1);
    }
    const server = await startServeOut(OUT_DIR);
    baseUrl = server.baseUrl;
    stopServer = server.close;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    serviceWorkers: "block",
    viewport: { width: 1280, height: 720 },
  });
  await context.addInitScript(NO_ANIMATIONS_JS);
  const page = await context.newPage();

  console.log(`Run directory: ${runDir}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Pages: ${slugs.length}`);

  for (const slug of slugs) {
    const slugDir = join(runDir, slug);
    mkdirSync(slugDir, { recursive: true });
    const url = `${baseUrl}/visualizer/${slug}/`;
    process.stdout.write(`${slug} … `);

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await waitMechanismReady(page);

    const tabs = page.locator(".viz-tabs__tab");
    const count = await tabs.count();
    const expected = manifest.slugs[slug].scenarioCount;
    if (count !== expected) {
      console.warn(
        `\n  warning: ${slug} expected ${expected} tabs, found ${count}`,
      );
    }

    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(400);
      await waitMechanismReady(page);
      const label = (await tabs.nth(i).innerText()).trim();
      const file = `${String(i + 1).padStart(2, "0")}-${slugifyLabel(label)}.png`;
      await prepareFullPageCapture(page);
      await page.locator(".viz-page").screenshot({
        path: join(slugDir, file),
      });
    }

    console.log(`${count} shot${count === 1 ? "" : "s"}`);
  }

  await browser.close();
  if (stopServer) await stopServer();

  console.log(`Done. Screenshots: ${runDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
