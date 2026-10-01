// Char offsets below are relative to a content root's full textContent.

export function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentNode?.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(".wiki-marker")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
}

export function nodeAtOffset(
  root: HTMLElement,
  offset: number,
): { node: Text; localOffset: number } | null {
  let pos = 0;
  for (const node of textNodes(root)) {
    const len = node.nodeValue?.length ?? 0;
    if (offset <= pos + len) return { node, localOffset: offset - pos };
    pos += len;
  }
  return null;
}

export function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  const startHit = nodeAtOffset(root, start);
  const endHit = nodeAtOffset(root, end);
  if (!startHit || !endHit) return null;
  const range = document.createRange();
  range.setStart(startHit.node, startHit.localOffset);
  range.setEnd(endHit.node, endHit.localOffset);
  return range;
}

export function globalOffset(root: HTMLElement, node: Node, localOffset: number): number {
  let pos = 0;
  for (const n of textNodes(root)) {
    if (n === node) return pos + localOffset;
    pos += n.nodeValue?.length ?? 0;
  }
  return -1;
}

export function snippetMatchesAt(fullText: string, offset: number, snippet: string): boolean {
  return !!snippet && fullText.slice(offset, offset + snippet.length) === snippet;
}

const REANCHOR_SEARCH_WINDOW = 2000;

// Returns the offset where `snippet` was found near `offset`, or -1 if not found nearby.
export function findNearbyOffset(fullText: string, offset: number, snippet: string): number {
  if (!snippet) return -1;
  const from = Math.max(0, offset - REANCHOR_SEARCH_WINDOW);
  const to = Math.min(fullText.length, offset + REANCHOR_SEARCH_WINDOW);
  const window = fullText.slice(from, to);
  const localIdx = window.indexOf(snippet);
  return localIdx === -1 ? -1 : from + localIdx;
}
