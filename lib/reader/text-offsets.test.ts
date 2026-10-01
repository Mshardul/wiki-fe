import { beforeEach, describe, expect, it } from "vitest";
import {
  findNearbyOffset,
  globalOffset,
  nodeAtOffset,
  rangeFromOffsets,
  snippetMatchesAt,
  textNodes,
} from "./text-offsets";

function setBody(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById("root") as HTMLElement;
}

describe("lib/reader/text-offsets", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("textNodes skips SCRIPT/STYLE and existing marker subtrees", () => {
    const root = setBody(
      '<p>hello</p><script>var x=1;</script><style>.a{}</style><span class="wiki-marker">🤔</span><p>world</p>',
    );
    const texts = textNodes(root).map((n) => n.nodeValue);
    expect(texts).toEqual(["hello", "world"]);
  });

  it("nodeAtOffset finds the correct text node and local offset", () => {
    const root = setBody("<p>hello</p><p>world</p>");
    const hit = nodeAtOffset(root, 7);
    expect(hit?.node.nodeValue).toBe("world");
    expect(hit?.localOffset).toBe(2);
  });

  it("rangeFromOffsets builds a range spanning two text nodes", () => {
    const root = setBody("<p>hello</p><p>world</p>");
    const range = rangeFromOffsets(root, 3, 7);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe("lowo");
  });

  it("globalOffset is the inverse of nodeAtOffset", () => {
    const root = setBody("<p>hello</p><p>world</p>");
    const hit = nodeAtOffset(root, 7);
    expect(hit).not.toBeNull();
    if (!hit) return;
    expect(globalOffset(root, hit.node, hit.localOffset)).toBe(7);
  });

  it("snippetMatchesAt confirms the snippet at the given offset", () => {
    expect(snippetMatchesAt("hello world", 6, "world")).toBe(true);
    expect(snippetMatchesAt("hello world", 0, "world")).toBe(false);
  });

  it("findNearbyOffset relocates a snippet that moved within the search window", () => {
    const fullText = "hello world, this is a test";
    expect(findNearbyOffset(fullText, 6, "a test")).toBe(fullText.indexOf("a test"));
  });

  it("findNearbyOffset returns -1 when the snippet is gone", () => {
    expect(findNearbyOffset("hello world", 0, "missing")).toBe(-1);
  });
});
