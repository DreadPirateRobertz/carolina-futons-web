import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import {
  PRICE_LOCK_DAYS,
  PriceLockGuarantee,
  daysRemaining,
  priceLockStorageKey,
} from "@/components/product/PriceLockGuarantee";

const SLUG = "kingston-futon-frame";
const KEY = priceLockStorageKey(SLUG);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-05-05T12:00:00Z").getTime();

const fixedNow = () => FIXED_NOW;
const nowAfterDays = (days: number) => () => FIXED_NOW + days * MS_PER_DAY;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daysRemaining", () => {
  it("returns the full lock window for a brand-new view", () => {
    expect(daysRemaining(FIXED_NOW, FIXED_NOW)).toBe(PRICE_LOCK_DAYS);
  });

  it("counts down by whole days as time passes", () => {
    expect(daysRemaining(FIXED_NOW, FIXED_NOW + 3 * MS_PER_DAY)).toBe(11);
    expect(daysRemaining(FIXED_NOW, FIXED_NOW + 13 * MS_PER_DAY)).toBe(1);
  });

  it("clamps to 0 once the 14-day window has elapsed", () => {
    expect(daysRemaining(FIXED_NOW, FIXED_NOW + 14 * MS_PER_DAY)).toBe(0);
    expect(daysRemaining(FIXED_NOW, FIXED_NOW + 100 * MS_PER_DAY)).toBe(0);
  });

  it("treats clock-skewed future timestamps as a fresh view", () => {
    expect(daysRemaining(FIXED_NOW + MS_PER_DAY, FIXED_NOW)).toBe(PRICE_LOCK_DAYS);
  });

  it("treats non-finite timestamps as a fresh view", () => {
    expect(daysRemaining(NaN, FIXED_NOW)).toBe(PRICE_LOCK_DAYS);
  });
});

describe("<PriceLockGuarantee />", () => {
  it("renders a check icon and the trust copy on first view", () => {
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(screen.getByTestId("price-lock-guarantee")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Price locked for ${PRICE_LOCK_DAYS} days after view`, "i")),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("price-lock-countdown")).not.toBeInTheDocument();
  });

  it("writes the first-view timestamp to localStorage on mount", () => {
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(window.localStorage.getItem(KEY)).toBe(String(FIXED_NOW));
  });

  it("does not overwrite an existing first-view timestamp", () => {
    const earlier = FIXED_NOW - 5 * MS_PER_DAY;
    window.localStorage.setItem(KEY, String(earlier));
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(window.localStorage.getItem(KEY)).toBe(String(earlier));
  });

  it("shows the countdown when revisited within the lock window", () => {
    const earlier = FIXED_NOW - 5 * MS_PER_DAY;
    window.localStorage.setItem(KEY, String(earlier));
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    const countdown = screen.getByTestId("price-lock-countdown");
    expect(countdown.textContent).toMatch(/Locked for 9 days/i);
  });

  it("uses singular 'day' on the final day", () => {
    const earlier = FIXED_NOW - 13 * MS_PER_DAY;
    window.localStorage.setItem(KEY, String(earlier));
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(screen.getByTestId("price-lock-countdown").textContent).toMatch(/Locked for 1 day\b/i);
  });

  it("falls back to the trust copy (no countdown) once the window has lapsed", () => {
    const earlier = FIXED_NOW - 14 * MS_PER_DAY;
    window.localStorage.setItem(KEY, String(earlier));
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(screen.queryByTestId("price-lock-countdown")).not.toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Price locked for ${PRICE_LOCK_DAYS} days after view`, "i")),
    ).toBeInTheDocument();
  });

  it("treats corrupt localStorage values as a fresh view and rewrites them", () => {
    window.localStorage.setItem(KEY, "not-a-number");
    render(<PriceLockGuarantee productSlug={SLUG} now={fixedNow} />);
    expect(window.localStorage.getItem(KEY)).toBe(String(FIXED_NOW));
    expect(screen.queryByTestId("price-lock-countdown")).not.toBeInTheDocument();
  });

  it("scopes the storage key per productSlug so two PDPs don't share a lock", () => {
    window.localStorage.setItem(priceLockStorageKey("a"), String(FIXED_NOW - 3 * MS_PER_DAY));
    render(<PriceLockGuarantee productSlug="b" now={fixedNow} />);
    expect(window.localStorage.getItem(priceLockStorageKey("b"))).toBe(String(FIXED_NOW));
    expect(screen.queryByTestId("price-lock-countdown")).not.toBeInTheDocument();
  });

  it("survives a localStorage that throws on access without crashing the UI", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    render(<PriceLockGuarantee productSlug={SLUG} now={nowAfterDays(0)} />);
    expect(screen.getByTestId("price-lock-guarantee")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Price locked for ${PRICE_LOCK_DAYS} days after view`, "i")),
    ).toBeInTheDocument();
    getItem.mockRestore();
  });

  it("re-reads storage when productSlug changes (PDP→PDP client nav)", () => {
    const earlier = FIXED_NOW - 2 * MS_PER_DAY;
    window.localStorage.setItem(priceLockStorageKey("frame-a"), String(earlier));
    const { rerender } = render(<PriceLockGuarantee productSlug="frame-a" now={fixedNow} />);
    expect(screen.getByTestId("price-lock-countdown").textContent).toMatch(/Locked for 12 days/i);

    act(() => {
      rerender(<PriceLockGuarantee productSlug="frame-b" now={fixedNow} />);
    });
    expect(screen.queryByTestId("price-lock-countdown")).not.toBeInTheDocument();
  });
});
