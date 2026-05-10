import { describe, expect, it } from "vitest";

// cf-xqc0: pin the announcement-defaults module's contract — both
// surfaces (server layout.tsx + client AnnouncementBarCartAware) read
// from this single source of truth, so a future "use client" directive
// here would re-introduce the cf-b3mf blank-bar outage.

import {
  FREE_DELIVERY_THRESHOLD_CENTS,
  ROTATION_CTAS_DEFAULT,
  ROTATION_INTERVAL_MS,
  ROTATION_MESSAGES_DEFAULT,
} from "@/lib/cms/announcement-defaults";
// Legacy aliases re-exported through the client wrapper so existing
// callers keep working. Pinned here so a refactor that drops the
// re-exports trips the test instead of silently breaking imports.
import {
  ROTATION_CTAS,
  ROTATION_MESSAGES,
} from "@/components/site/AnnouncementBarCartAware";

describe("announcement-defaults module (cf-xqc0)", () => {
  it("FREE_DELIVERY_THRESHOLD_CENTS = 150_000 ($1,500)", () => {
    expect(FREE_DELIVERY_THRESHOLD_CENTS).toBe(150_000);
  });

  it("ROTATION_INTERVAL_MS = 5000ms", () => {
    expect(ROTATION_INTERVAL_MS).toBe(5_000);
  });

  it("ROTATION_MESSAGES_DEFAULT has 5 slots", () => {
    expect(ROTATION_MESSAGES_DEFAULT).toHaveLength(5);
  });

  it("slot 0 derives the $1,500 threshold from FREE_DELIVERY_THRESHOLD_CENTS — no parallel string", () => {
    expect(ROTATION_MESSAGES_DEFAULT[0]).toMatch(/\$1,500/);
    expect(ROTATION_MESSAGES_DEFAULT[0]).toMatch(/free white-glove delivery/i);
  });

  it("ROTATION_CTAS_DEFAULT pairs with messages by index, slot 3 is the only CTA", () => {
    expect(ROTATION_CTAS_DEFAULT).toHaveLength(5);
    expect(ROTATION_CTAS_DEFAULT[0]).toBeUndefined();
    expect(ROTATION_CTAS_DEFAULT[1]).toBeUndefined();
    expect(ROTATION_CTAS_DEFAULT[2]).toBeUndefined();
    expect(ROTATION_CTAS_DEFAULT[3]).toEqual({
      ctaLabel: "Order free swatches",
      ctaHref: "/swatch-request",
    });
    expect(ROTATION_CTAS_DEFAULT[4]).toBeUndefined();
  });

  it("legacy ROTATION_MESSAGES alias === ROTATION_MESSAGES_DEFAULT (same array reference)", () => {
    expect(ROTATION_MESSAGES).toBe(ROTATION_MESSAGES_DEFAULT);
  });

  it("legacy ROTATION_CTAS alias === ROTATION_CTAS_DEFAULT (same array reference)", () => {
    expect(ROTATION_CTAS).toBe(ROTATION_CTAS_DEFAULT);
  });
});
