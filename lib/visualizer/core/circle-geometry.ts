export interface Pt {
  x: number;
  y: number;
}

// Position 0 is at the top and positions run clockwise.
export function angleOf(at: number, size: number): number {
  return (at / size) * 2 * Math.PI - Math.PI / 2;
}

export function polar(cx: number, cy: number, r: number, at: number, size: number): Pt {
  const a = angleOf(at, size);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// Clockwise distance from one position to another.
export const clockwiseGap = (from: number, to: number, size: number): number =>
  (((to - from) % size) + size) % size;

// SVG path for the clockwise arc from one position to another; a full turn when they match.
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  size: number,
): string {
  const gap = clockwiseGap(from, to, size);
  const a = polar(cx, cy, r, from, size);
  if (gap === 0) {
    const b = polar(cx, cy, r, from + size / 2, size);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y}`;
  }
  const b = polar(cx, cy, r, to, size);
  const large = gap > size / 2 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

// Circular distance, the shorter way round.
export const circularGap = (a: number, b: number, size: number): number => {
  const d = clockwiseGap(a, b, size);
  return Math.min(d, size - d);
};

// Layer per point (0 stays on the ring): a point too close to one already placed moves out a layer.
export function layerPoints(ats: number[], size: number, minGap: number, layers = 3): number[] {
  const out: number[] = ats.map(() => -1);
  const order = ats.map((_, i) => i).sort((a, b) => (ats[a] as number) - (ats[b] as number));
  for (const i of order) {
    let layer = 0;
    while (layer < layers - 1) {
      const crowded = order.some(
        (j) => out[j] === layer && circularGap(ats[i] as number, ats[j] as number, size) < minGap,
      );
      if (!crowded) break;
      layer += 1;
    }
    out[i] = layer;
  }
  return out;
}
