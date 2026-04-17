import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AnnouncementBar } from "@/components/site/AnnouncementBar";

describe("AnnouncementBar (cf-3qt.1 Phase 1)", () => {
  it("renders default free-delivery message when no props provided", () => {
    render(<AnnouncementBar />);
    expect(
      screen.getByText(/free white-glove delivery/i)
    ).toBeInTheDocument();
  });

  it("renders custom message when provided", () => {
    render(<AnnouncementBar message="Spring sale — 20% off" />);
    expect(screen.getByText(/spring sale/i)).toBeInTheDocument();
  });

  it("renders a CTA link when both ctaLabel and ctaHref are present", () => {
    render(
      <AnnouncementBar
        message="Free shipping this week"
        ctaLabel="Shop now"
        ctaHref="/sale"
      />
    );
    expect(screen.getByRole("link", { name: /shop now/i })).toHaveAttribute(
      "href",
      "/sale"
    );
  });

  it("does not render a CTA when href is missing", () => {
    render(<AnnouncementBar message="Hi" ctaLabel="Shop" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("exposes itself as an accessible region", () => {
    render(<AnnouncementBar />);
    expect(
      screen.getByRole("region", { name: /site announcement/i })
    ).toBeInTheDocument();
  });
});
