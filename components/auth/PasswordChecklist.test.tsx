import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordChecklist } from "./PasswordChecklist";

describe("PasswordChecklist", () => {
  it("shows all five rules failing for an empty password", () => {
    render(<PasswordChecklist password="" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.every((li) => !li.classList.contains("ok"))).toBe(true);
  });

  it("shows all five rules passing for a strong password", () => {
    render(<PasswordChecklist password="LongEnough1!xx" />);
    const items = screen.getAllByRole("listitem");
    expect(items.every((li) => li.classList.contains("ok"))).toBe(true);
  });

  it("updates per-rule as the password changes", () => {
    const { rerender } = render(<PasswordChecklist password="alllowercase" />);
    const upperRule = () =>
      screen.getAllByRole("listitem").find((li) => li.textContent?.includes("uppercase"));
    expect(upperRule()?.classList.contains("ok")).toBe(false);
    rerender(<PasswordChecklist password="Alllowercase" />);
    expect(upperRule()?.classList.contains("ok")).toBe(true);
  });
});
