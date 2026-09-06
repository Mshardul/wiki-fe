import { buildContent } from "../../lib/content/build";

// Render the corpus once so suites read the emitted generated/ JSON instead of re-rendering.
export async function setup(): Promise<void> {
  await buildContent();
}
