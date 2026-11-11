import { describe, expect, it } from "vitest";
import { postgresWalModule, runPostgresWal } from "./module";

describe("postgres wal module", () => {
  it("has four scenarios", () => {
    expect(
      ["happy", "async", "recovery", "replica"].map(
        (id) => runPostgresWal({ scenario: id }).frames.length,
      ),
    ).toEqual([5, 5, 5, 5]);
  });

  it("renders machine and replica views", () => {
    const happy = runPostgresWal({ scenario: "happy" }).frames[0]?.model;
    expect(happy?.kind).toBe("wal");
    if (happy?.kind === "wal") expect(happy.machine?.name).toBe("Primary");

    const repl = runPostgresWal({ scenario: "replica" }).frames[3]?.model;
    if (repl?.kind === "wal") expect(repl.repl?.level).toBe("remote_apply");
  });

  it("registers module metadata", () => {
    expect(postgresWalModule.slug).toBe("inside-the-postgres-wal");
    expect(postgresWalModule.defaults()).toEqual({ scenario: "happy" });
  });
});
