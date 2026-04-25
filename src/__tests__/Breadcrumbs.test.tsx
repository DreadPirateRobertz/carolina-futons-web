import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";

// cf-breadcrumbs: visual nav only. JSON-LD BreadcrumbList ships separately
// via the JsonLd component fed by buildBreadcrumbSchema (see #110). Assertions
// target semantic structure, link precedence, and aria-current — copy can
// change without churning tests.

describe("Breadcrumbs component", () => {
  it("renders a labelled Breadcrumb nav with an ordered list", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Futon frames" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeTruthy();
    const list = within(nav).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("renders non-terminal items as links, terminal item as aria-current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Futon frames" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/");
    expect(links[1].getAttribute("href")).toBe("/shop");
    const current = within(nav).getByText("Futon frames");
    expect(current.closest("a")).toBeNull();
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("returns null for an empty items list", () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
