import { posix } from "node:path";

export function resolveContentHref(articlePath: string, href: string): string {
  const clean = href.split("#")[0] ?? "";
  return posix.normalize(posix.join(posix.dirname(articlePath), clean));
}
