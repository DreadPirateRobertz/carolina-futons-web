import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// cf-g0mu (cf-zmsq.followup wave 6): focus-visible pins on the last two
// high-traffic consumer-facing surfaces still missing the cf-cta ring.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/style-quiz",
  useSearchParams: () => new URLSearchParams(),
}));

// ── QuizResult — 4 Links (View product per result, Browse-shop fallback ×2,
//                 Share link) ─────────────────────────────────────────────
import { QuizResult } from "@/components/quiz/QuizResult";

describe("QuizResult focus-visible (cf-g0mu)", () => {
  const sampleResult = {
    product: {
      _id: "p-1",
      name: "Kingston Futon Frame",
      slug: "kingston-futon-frame",
      formattedPrice: "$619.00",
    },
    reason: "Matches your hardwood + queen size preferences.",
  };

  it("View-product Link on each result carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <QuizResult
        results={[sampleResult as never]}
        copy="Try one of these matches."
      />,
    );
    const link = container.querySelector(
      'a[href="/products/kingston-futon-frame"]',
    );
    expect(link).not.toBeNull();
    const classes = (link?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("Browse-full-collection Link (empty state) carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<QuizResult results={[]} copy="" />);
    const browse = Array.from(container.querySelectorAll('a[href="/shop"]'))[0];
    expect(browse).toBeDefined();
    const classes = (browse?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("Browse-full-collection Link (footer) carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <QuizResult
        results={[sampleResult as never]}
        copy="Try one of these matches."
      />,
    );
    const browse = Array.from(container.querySelectorAll('a[href="/shop"]'))[0];
    expect(browse).toBeDefined();
    const classes = (browse?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("Share-result Link carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <QuizResult
        results={[sampleResult as never]}
        copy=""
        shareHref="/style-quiz/share/abc123"
      />,
    );
    const share = container.querySelector(
      'a[href="/style-quiz/share/abc123"]',
    );
    expect(share).not.toBeNull();
    const classes = (share?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// ── DragDropRoomPlanner — 3 buttons (Clear + per-item Rotate + Remove) ──
// The placed-item buttons only render when an item is on the canvas; that
// requires drag-drop simulation which is brittle in jsdom. Restrict
// coverage to the Clear button (always rendered) + a className-presence
// check on the Rotate/Remove buttons via the static source string match
// (they wrap their state in nested template literals so unit-render
// with seeded items is the cleanest path — guarded with localStorage).
import { DragDropRoomPlanner } from "@/components/room/DragDropRoomPlanner";
import {
  ROOM_PLANNER_STORAGE_KEY,
} from "@/lib/room-planner/save";
import { encodeLayout } from "@/lib/design-a-room/planner-logic";

describe("DragDropRoomPlanner focus-visible (cf-g0mu)", () => {
  it("Clear button carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<DragDropRoomPlanner />);
    const clear = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.textContent?.trim() === "Clear");
    expect(clear).toBeDefined();
    const classes = (clear?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("Rotate + Remove per-item buttons carry focus-visible:ring-cf-cta", async () => {
    // Seed a placed item via localStorage so the canvas renders one. The
    // planner encodes its layout as base64-wrapped JSON under the
    // ROOM_PLANNER_STORAGE_KEY, with field names { roomWFt, roomDFt, items }.
    window.localStorage.setItem(
      ROOM_PLANNER_STORAGE_KEY,
      encodeLayout({
        roomWFt: 10,
        roomDFt: 10,
        items: [
          {
            id: "item-1",
            futonIdx: 0,
            xIn: 24,
            yIn: 24,
            rotated: false,
          },
        ],
      }),
    );
    const { container, findByLabelText } = render(<DragDropRoomPlanner />);
    // Layout loads in a useEffect — wait for the rotate/remove buttons to
    // appear before asserting.
    const rotate = await findByLabelText(/^Rotate/);
    const remove = await findByLabelText(/^Remove/);
    expect((rotate.className ?? "").split(/\s+/)).toContain(
      "focus-visible:ring-cf-cta",
    );
    expect((remove.className ?? "").split(/\s+/)).toContain(
      "focus-visible:ring-cf-cta",
    );
    window.localStorage.removeItem(ROOM_PLANNER_STORAGE_KEY);
    void container;
  });
});
