import type { Rich } from "@/lib/visualizer/core/rich";
import { keyText } from "@/lib/visualizer/core/rich";

/** Port HTML step bodies from mechanism drafts: code/b → key tone; em → plain text. */
export function richFromHtml(html: string): Rich {
  const out: Rich = [];
  const re = /<(code|b|em)>(.*?)<\/\1>/gi;
  let last = 0;
  for (const match of html.matchAll(re)) {
    const at = match.index ?? 0;
    if (at > last) out.push(html.slice(last, at));
    const tag = (match[1] ?? "").toLowerCase();
    const inner = match[2] ?? "";
    if (tag === "em") out.push(inner);
    else out.push(keyText(inner));
    last = at + match[0].length;
  }
  if (last < html.length) out.push(html.slice(last));
  return out.length > 0 ? out : [html];
}
