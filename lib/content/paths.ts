import { posix } from "node:path";

// Resolve a relative markdown href against the linking article's path to a
// repo-relative content path (fragment stripped). Ports nav-utils.js resolvePath.
export function resolveContentHref(articlePath: string, href: string): string {
  const clean = href.split("#")[0] ?? "";
  return posix.normalize(posix.join(posix.dirname(articlePath), clean));
}
