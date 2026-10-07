export type Tone = "key" | "good" | "bad" | "warn" | "muted";
export type RichPart = string | { text: string; tone: Tone };
export type Rich = RichPart[];

export const keyText = (text: string): RichPart => ({ text, tone: "key" });
export const goodText = (text: string): RichPart => ({ text, tone: "good" });
export const badText = (text: string): RichPart => ({ text, tone: "bad" });
export const warnText = (text: string): RichPart => ({ text, tone: "warn" });
export const mutedText = (text: string): RichPart => ({ text, tone: "muted" });

export function richText(value: Rich): string {
  return value.map((p) => (typeof p === "string" ? p : p.text)).join("");
}

export function fill(template: string, vars: Record<string, string>): Rich {
  const out: Rich = [];
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(template.slice(last, at));
    const v = vars[m[1] ?? ""];
    out.push(v === undefined ? m[0] : keyText(v));
    last = at + m[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}
