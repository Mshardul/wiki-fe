import { afterEach } from "vitest";

// jsdom implements neither observer; islands use both. Minimal no-op stubs.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = NoopObserver;
}

afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
  // islands append/mutate document.body directly; clear leftovers between tests
  document.body.replaceChildren();
  document.body.className = "";
  localStorage.clear();
});
