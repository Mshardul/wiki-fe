import { describe, expect, it } from "vitest";
import { httpRequestPathModule, runHttpRequestPath } from "./module";

describe("http request path module", () => {
  it("has four scenarios with expected frame counts", () => {
    expect(
      ["happy", "reject", "timeout", "upload"].map(
        (id) => runHttpRequestPath({ scenario: id }).frames.length,
      ),
    ).toEqual([7, 5, 5, 6]);
  });

  it("renders pipeline model on first happy frame", () => {
    const model = runHttpRequestPath({ scenario: "happy" }).frames[0]?.model;
    expect(model?.kind).toBe("http-pipeline");
    if (model?.kind === "http-pipeline") {
      expect(model.active).toBe("alb");
      expect(model.token.t).toBe("GET /orders");
    }
  });

  it("registers module metadata", () => {
    expect(httpRequestPathModule.slug).toBe("inside-an-http-request");
    expect(httpRequestPathModule.defaults()).toEqual({ scenario: "happy" });
  });
});
