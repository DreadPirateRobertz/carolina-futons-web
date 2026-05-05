import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type CustomerVideoReview,
  CUSTOMER_VIDEO_REVIEWS,
  getCustomerVideoReviewsByProductSlug,
} from "@/lib/discovery/customer-video-reviews";

// CF-ou66.3 / cfw-9zp: customer video review grid + lightbox below PdpReviews.
// The grid is hidden when the loader returns no entries for the slug; the
// lightbox uses the same ESC/backdrop dismissal contract as PdpImageLightbox.

const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn<() => boolean | null>(() => false),
  divCalls: [] as Array<{
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
  }>,
}));

vi.mock("framer-motion", () => ({
  m: {
    div: ({
      children,
      initial,
      animate,
      transition,
      ...rest
    }: {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    } & Record<string, unknown>) => {
      motionMocks.divCalls.push({ initial, animate, transition });
      return <div {...rest}>{children}</div>;
    },
  },
  useReducedMotion: motionMocks.useReducedMotion,
}));

beforeEach(() => {
  motionMocks.divCalls = [];
  motionMocks.useReducedMotion.mockReturnValue(false);
});

import { CustomerVideoReviewGrid } from "@/components/product/CustomerVideoReviewGrid";

const YT: CustomerVideoReview = {
  id: "cvr-yt",
  productSlug: "asheville-futon-frame",
  author: "Marcia R.",
  rating: 5,
  caption: "Set up in our living room — guests love it.",
  date: "2026-04-12",
  source: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=ABCDEFG1234",
  embedUrl: "https://www.youtube.com/embed/ABCDEFG1234",
  posterUrl: "https://img.youtube.com/vi/ABCDEFG1234/hqdefault.jpg",
};

const MP4: CustomerVideoReview = {
  id: "cvr-mp4",
  productSlug: "asheville-futon-frame",
  author: "James T.",
  caption: "Quick conversion — six months in.",
  date: "2026-04-15",
  source: "mp4",
  videoUrl: "https://example.com/customer-video.mp4",
  posterUrl: "https://example.com/customer-video-poster.jpg",
};

const OTHER_SLUG: CustomerVideoReview = {
  ...MP4,
  id: "cvr-mp4-other",
  productSlug: "sedona-futon-frame",
};

// ── getCustomerVideoReviewsByProductSlug ────────────────────────────────────

describe("getCustomerVideoReviewsByProductSlug", () => {
  it("filters a caller-provided pool by productSlug", () => {
    const pool = [YT, MP4, OTHER_SLUG];
    const picked = getCustomerVideoReviewsByProductSlug(
      "asheville-futon-frame",
      pool,
    );
    expect(picked).toHaveLength(2);
    expect(picked.map((v) => v.id)).toEqual(["cvr-yt", "cvr-mp4"]);
  });

  it("returns [] for a slug with no entries in the pool", () => {
    const pool = [YT, MP4];
    expect(
      getCustomerVideoReviewsByProductSlug("nonexistent-slug", pool),
    ).toEqual([]);
  });

  it("returns [] for an empty slug regardless of pool", () => {
    expect(getCustomerVideoReviewsByProductSlug("", [YT])).toEqual([]);
  });

  it("defaults to the empty fixture when no pool is supplied", () => {
    // The fixture is empty by design until the Wix CMS collection lands.
    expect(CUSTOMER_VIDEO_REVIEWS).toEqual([]);
    expect(
      getCustomerVideoReviewsByProductSlug("asheville-futon-frame"),
    ).toEqual([]);
  });
});

// ── CustomerVideoReviewGrid — empty / hidden ────────────────────────────────

describe("CustomerVideoReviewGrid — empty state", () => {
  it("renders nothing when videos is empty", () => {
    const { container } = render(<CustomerVideoReviewGrid videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ── CustomerVideoReviewGrid — grid rendering ───────────────────────────────

describe("CustomerVideoReviewGrid — grid", () => {
  it("renders a section landmark with the heading", () => {
    render(<CustomerVideoReviewGrid videos={[YT, MP4]} />);
    expect(
      screen.getByRole("region", { name: /customer videos/i }),
    ).toBeInTheDocument();
  });

  it("exposes the data-slot for layout introspection", () => {
    const { container } = render(
      <CustomerVideoReviewGrid videos={[YT, MP4]} />,
    );
    expect(
      container.querySelector('[data-slot="pdp-customer-video-reviews"]'),
    ).not.toBeNull();
  });

  it("renders one card per video", () => {
    render(<CustomerVideoReviewGrid videos={[YT, MP4]} />);
    expect(screen.getAllByTestId("customer-video-card")).toHaveLength(2);
  });

  it("renders the author + caption on each card", () => {
    render(<CustomerVideoReviewGrid videos={[YT, MP4]} />);
    expect(screen.getByText("Marcia R.")).toBeInTheDocument();
    expect(screen.getByText(/guests love it/i)).toBeInTheDocument();
    expect(screen.getByText("James T.")).toBeInTheDocument();
    expect(screen.getByText(/quick conversion/i)).toBeInTheDocument();
  });

  it("renders the rating badge only when present", () => {
    render(<CustomerVideoReviewGrid videos={[YT, MP4]} />);
    // YT has rating 5 → shows the aria-label; MP4 has no rating → no extra
    // "Rated N out of 5" badge.
    expect(
      screen.getByLabelText(/rated 5 out of 5/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/rated 0 out of 5/i),
    ).not.toBeInTheDocument();
  });

  it("uses the 1-col → 3-col responsive grid utilities", () => {
    const { container } = render(
      <CustomerVideoReviewGrid videos={[YT, MP4]} />,
    );
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    expect(ul!.className).toContain("grid-cols-1");
    expect(ul!.className).toContain("md:grid-cols-3");
  });

  it("each card is a button with an accessible play label", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    expect(
      screen.getByRole("button", { name: /play marcia r\.'s video review/i }),
    ).toBeInTheDocument();
  });
});

// ── CustomerVideoReviewGrid — lightbox open/close ──────────────────────────

describe("CustomerVideoReviewGrid — lightbox", () => {
  it("does not render the lightbox until a card is clicked", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the lightbox with an iframe for youtube source", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("customer-video-iframe")).toBeInTheDocument();
  });

  it("opens the lightbox with a native player for mp4 source", () => {
    render(<CustomerVideoReviewGrid videos={[MP4]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    expect(screen.getByTestId("customer-video-player")).toBeInTheDocument();
  });

  it("the youtube iframe src includes autoplay=1", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    const iframe = screen.getByTestId(
      "customer-video-iframe",
    ) as HTMLIFrameElement;
    expect(iframe.src).toContain("autoplay=1");
    expect(iframe.src).toContain("rel=0");
  });

  it("opens the lightbox for the clicked video when multiple cards exist", () => {
    render(<CustomerVideoReviewGrid videos={[YT, MP4]} />);
    const cards = screen.getAllByTestId("customer-video-card");
    fireEvent.click(cards[1]);
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toContain(
      "James T.",
    );
  });

  it("closes the lightbox on ESC", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the lightbox on backdrop click", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does NOT close when the player itself is clicked", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    fireEvent.click(screen.getByTestId("customer-video-iframe"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes via the explicit close button", () => {
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    fireEvent.click(screen.getByRole("button", { name: /close video/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ── reduced motion ─────────────────────────────────────────────────────────

describe("CustomerVideoReviewGrid — reduced motion", () => {
  it("omits crossfade props under reduced motion", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    const lastCall = motionMocks.divCalls[motionMocks.divCalls.length - 1];
    expect(lastCall.initial).toBeUndefined();
    expect(lastCall.animate).toBeUndefined();
    expect(lastCall.transition).toBeUndefined();
  });

  it("applies crossfade props under normal motion", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<CustomerVideoReviewGrid videos={[YT]} />);
    fireEvent.click(screen.getByTestId("customer-video-card"));
    const lastCall = motionMocks.divCalls[motionMocks.divCalls.length - 1];
    expect(lastCall.initial).toEqual({ opacity: 0 });
    expect(lastCall.animate).toEqual({ opacity: 1 });
  });
});
