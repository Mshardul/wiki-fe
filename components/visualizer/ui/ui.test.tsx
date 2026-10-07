import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badText, keyText } from "@/lib/visualizer/core/rich";
import { ChoiceGroup } from "./ChoiceGroup";
import { IconButton } from "./IconButton";
import { RichText } from "./RichText";
import { Tabs } from "./Tabs";
import { VarsTable } from "./VarsTable";

describe("visualizer ui primitives", () => {
  it("ChoiceGroup marks the selected option and reports changes", () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        label="Policy"
        value="lru"
        onChange={onChange}
        options={[
          { value: "lru", label: "LRU" },
          { value: "fifo", label: "FIFO" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Policy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    expect(onChange).toHaveBeenCalledWith("fifo");
  });

  it("ChoiceGroup works with numeric values", () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        label="Speed"
        variant="segmented"
        value={1}
        onChange={onChange}
        options={[
          { value: 0.5, label: "0.5×" },
          { value: 1, label: "1×" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it("IconButton exposes its label to assistive tech and hover", () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Next request" onClick={onClick}>
        ›
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Next request" });
    expect(btn.getAttribute("title")).toBe("Next request");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("Tabs selects one tab and reports changes", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        idPrefix="t"
        active="step"
        onChange={onChange}
        tabs={[
          { id: "step", label: "Step" },
          { id: "log", label: "Log" },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Step" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));
    expect(onChange).toHaveBeenCalledWith("log");
  });

  it("RichText renders tone classes", () => {
    const { container } = render(<RichText value={[keyText("F"), " ", badText("miss")]} />);
    expect(container.textContent).toBe("F miss");
    expect(container.querySelector(".viz-rich--key")?.textContent).toBe("F");
    expect(container.querySelector(".viz-rich--bad")?.textContent).toBe("miss");
  });

  it("VarsTable shows now/before and flags changed values", () => {
    render(
      <VarsTable
        now={[
          { name: "key", value: "F" },
          { name: "hits", value: "2" },
        ]}
        before={[
          { name: "key", value: "A" },
          { name: "hits", value: "2" },
        ]}
      />,
    );
    const keyRow = screen.getByRole("row", { name: /key/ });
    expect(keyRow.querySelector(".viz-vars__now")?.classList.contains("is-changed")).toBe(true);
    expect(keyRow.querySelector(".viz-vars__before")?.textContent).toBe("A");
    const hitsRow = screen.getByRole("row", { name: /hits/ });
    expect(hitsRow.querySelector(".viz-vars__now")?.classList.contains("is-changed")).toBe(false);
  });

  it("VarsTable with no previous frame shows dashes", () => {
    render(<VarsTable now={[{ name: "key", value: "A" }]} before={null} />);
    expect(
      screen.getByRole("row", { name: /key/ }).querySelector(".viz-vars__before")?.textContent,
    ).toBe("—");
  });
});
