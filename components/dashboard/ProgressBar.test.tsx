import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders 3 of 4 as 75% fill and label", () => {
    const { container } = render(<ProgressBar label="Components" completed={3} total={4} />);
    expect(screen.getByText("Components")).toBeTruthy();
    expect(screen.getByText("3 / 4 (75%)")).toBeTruthy();
    const fill = container.querySelector(".dashboard-bar-fill--completed") as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("wraps in a link when href is provided", () => {
    render(
      <ProgressBar
        label="System Design"
        completed={0}
        total={2}
        href="/dashboard/system-design/"
      />,
    );
    const link = screen.getByRole("link", { name: /System Design/ });
    expect(link.getAttribute("href")).toMatch(/^\/dashboard\/system-design\/?$/);
    expect(link.classList.contains("dashboard-card--link")).toBe(true);
  });
});
