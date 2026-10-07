import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { ConfigPanel } from "./ConfigPanel";
import { SidePanel } from "./SidePanel";
import { VizHeader } from "./VizHeader";

const VALUES = {
  policy: "lru",
  capacity: 4,
  pattern: "hot",
  length: 12,
  seed: 0x7f3a,
  sequence: null,
};
const SEQ = "ABCADEAFBAGC".split("");

describe("VizHeader", () => {
  it("shows title, a disabled Compare, the article link and Copy link", () => {
    const onCopy = vi.fn();
    render(
      <VizHeader
        title="Eviction policies"
        subtitle="What a full cache throws out — and why."
        articleHref="/system-design/components/caching/#lru-least-recently-used"
        onCopyLink={onCopy}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    const compare = screen.getByRole("button", { name: "Compare" });
    expect((compare as HTMLButtonElement).disabled).toBe(true);
    expect(compare.getAttribute("title")).toBe("Compare — coming soon");
    // next/link drops the slash before "#" unless the app's trailingSlash config is loaded.
    expect(screen.getByRole("link", { name: "Read article" }).getAttribute("href")).toMatch(
      /^\/system-design\/components\/caching\/?#lru-least-recently-used$/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(onCopy).toHaveBeenCalledOnce();
  });
});

describe("SidePanel", () => {
  it("expanded shows content and a hide button; collapsed shows only the rail", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <SidePanel
        side="left"
        title="Policy"
        railLabel="Configure"
        railIcon="⚙"
        collapsed={false}
        onToggle={onToggle}
      >
        <p>inside</p>
      </SidePanel>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Policy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide Configure" }));
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(
      <SidePanel
        side="left"
        title="Policy"
        railLabel="Configure"
        railIcon="⚙"
        collapsed
        onToggle={onToggle}
      >
        <p>inside</p>
      </SidePanel>,
    );
    expect(screen.queryByText("inside")).toBeNull();
    expect(screen.getByRole("button", { name: "Show Configure" })).toBeTruthy();
  });
});

describe("ConfigPanel", () => {
  const setup = () => {
    const onChange = vi.fn();
    render(
      <ConfigPanel
        sections={evictionModule.sections}
        values={VALUES}
        sequence={SEQ}
        onChange={onChange}
      />,
    );
    return onChange;
  };

  it("renders policy chips without a duplicate visible label, plus the input group", () => {
    setup();
    expect(screen.getByRole("group", { name: "Policy" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Input" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("chips, sliders and the seed button report changes by field key", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    fireEvent.change(screen.getByLabelText("Cache size"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    fireEvent.click(screen.getByRole("button", { name: "New random run" }));
    expect(onChange.mock.calls.slice(0, 3)).toEqual([
      ["policy", "fifo"],
      ["capacity", 6],
      ["pattern", "scan"],
    ]);
    expect(onChange.mock.calls[3]?.[0]).toBe("seed");
    expect(typeof onChange.mock.calls[3]?.[1]).toBe("number");
    expect(screen.getByText("7f3a")).toBeTruthy();
  });

  it("the sequence field shows the run and applies an edit on Enter", () => {
    const onChange = setup();
    const input = screen.getByLabelText<HTMLInputElement>("Sequence");
    expect(input.value).toBe("A B C A D E A F B A G C");
    fireEvent.change(input, { target: { value: "a b c" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("sequence", ["A", "B", "C"]);
  });

  it("an unusable sequence shows an error and changes nothing", () => {
    const onChange = setup();
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Use letters A–Z")).toBeTruthy();
  });

  it("the sequence draft resyncs when a new run arrives", () => {
    const { rerender } = render(
      <ConfigPanel
        sections={evictionModule.sections}
        values={VALUES}
        sequence={SEQ}
        onChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Sequence"), { target: { value: "zzz" } });
    rerender(
      <ConfigPanel
        sections={evictionModule.sections}
        values={VALUES}
        sequence={["Q", "R"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Sequence").value).toBe("Q R");
  });
});
