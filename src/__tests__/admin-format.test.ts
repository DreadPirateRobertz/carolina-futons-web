import { describe, it, expect } from "vitest";

import {
  formatAuditTimestamp,
  formatRelativeTime,
} from "@/lib/admin/format";

// cfw-3w8: shared owner-mode time formatters. Pin the exact strings the
// /admin surfaces depend on so a future refactor (locale, date-library
// swap) can't silently change them.

describe("formatAuditTimestamp", () => {
  it("formats a UTC ISO-8601 string into 'YYYY-MM-DD HH:MMZ'", () => {
    expect(formatAuditTimestamp("2026-05-09T15:42:11.000Z")).toBe(
      "2026-05-09 15:42Z",
    );
  });

  it("truncates seconds (minute precision)", () => {
    expect(formatAuditTimestamp("2026-05-09T15:42:59.999Z")).toBe(
      "2026-05-09 15:42Z",
    );
  });

  it("normalises offset-bearing timestamps to UTC display", () => {
    // 2026-05-09T15:00:00+02:00 = 2026-05-09T13:00:00Z
    expect(formatAuditTimestamp("2026-05-09T15:00:00+02:00")).toBe(
      "2026-05-09 13:00Z",
    );
  });

  it("returns the input unchanged when not parseable", () => {
    expect(formatAuditTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("returns empty string unchanged", () => {
    expect(formatAuditTimestamp("")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.parse("2026-05-09T15:00:00.000Z");
  const fixedNow = () => NOW;

  it("emits 'just now' when diff < 60s", () => {
    expect(formatRelativeTime("2026-05-09T14:59:30.000Z", fixedNow)).toBe(
      "just now",
    );
  });

  it("emits 'Nm ago' when diff < 1h", () => {
    expect(formatRelativeTime("2026-05-09T14:55:00.000Z", fixedNow)).toBe(
      "5m ago",
    );
  });

  it("rounds down minutes (floors)", () => {
    // 4 minutes 30 seconds ago = "4m ago" not "5m ago"
    expect(formatRelativeTime("2026-05-09T14:55:30.000Z", fixedNow)).toBe(
      "4m ago",
    );
  });

  it("emits 'Nh ago' when diff < 24h", () => {
    expect(formatRelativeTime("2026-05-09T12:00:00.000Z", fixedNow)).toBe(
      "3h ago",
    );
  });

  it("emits 'Nd ago' when diff >= 24h", () => {
    expect(formatRelativeTime("2026-05-07T15:00:00.000Z", fixedNow)).toBe(
      "2d ago",
    );
  });

  it("returns the input unchanged when not parseable", () => {
    expect(formatRelativeTime("not-a-date", fixedNow)).toBe("not-a-date");
  });

  it("uses Date.now by default when no now() override", () => {
    // Just verify the call doesn't throw + returns a string. Exact value
    // depends on real time so we only assert shape.
    const result = formatRelativeTime(new Date().toISOString());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
