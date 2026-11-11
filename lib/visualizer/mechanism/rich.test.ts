import { describe, expect, it } from "vitest";
import { richFromHtml } from "./rich";

describe("richFromHtml", () => {
  it("maps code and b to key tone", () => {
    const body = richFromHtml("wait on <code>lock</code> and <b>retry</b>");
    expect(body).toEqual([
      "wait on ",
      { text: "lock", tone: "key" },
      " and ",
      { text: "retry", tone: "key" },
    ]);
  });

  it("strips em to plain text", () => {
    expect(richFromHtml("<em>maybe</em> later")).toEqual(["maybe", " later"]);
  });
});
