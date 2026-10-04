export const BASE_PATH = "/wiki-fe";
export const SITE_ORIGIN = "https://mshardul.github.io";
export const CANONICAL_BASE = `${SITE_ORIGIN}${BASE_PATH}`;

// An e2e build also emits the test-only canary route (app/e2e-canary); production builds never set this.
export const E2E_BUILD = process.env.WIKI_E2E === "1";
