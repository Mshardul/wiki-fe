import { buildContent } from "../../lib/content/build";

// Content project only: render the corpus once so artifacts.test.ts reads generated/*.
export async function setup(): Promise<void> {
  await buildContent();
}
