import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pingHealth } = vi.hoisted(() => ({ pingHealth: vi.fn() }));
vi.mock("@/lib/api", () => ({ pingHealth }));

import { HealthPing } from "./HealthPing";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("HealthPing", () => {
  it("pings on mount and again after the interval", () => {
    render(<HealthPing />);
    expect(pingHealth).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(pingHealth).toHaveBeenCalledTimes(2);
  });
});
