// Sorts object keys and arrays-of-objects so Python vs Node serialization order isn't a diff. Scalar arrays keep order.
export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(normalize);
    const allComposite = items.every((x) => x !== null && typeof x === "object");
    if (allComposite) {
      return [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return items;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort()) {
      out[key] = normalize(record[key]);
    }
    return out;
  }
  return value;
}
