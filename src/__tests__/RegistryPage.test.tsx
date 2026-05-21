import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-dag: RegistryPage reads registry.* keys from SiteContent.
// Stub getSiteContent so tests fall back to hardcoded defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

const mockGetMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: () => mockGetMemberSession(),
}));

const mockGetMyRegistriesAction = vi.fn();
vi.mock("@/app/actions/registry", () => ({
  getMyRegistriesAction: () => mockGetMyRegistriesAction(),
}));

// RegistryDashboard is a client component — stub it to keep tests focused on page copy.
vi.mock("@/components/registry/RegistryDashboard", () => ({
  RegistryDashboard: ({ initialRegistries }: { initialRegistries: unknown[] }) => (
    <div data-slot="registry-dashboard" data-count={initialRegistries.length} />
  ),
}));

import RegistryPage, { metadata } from "@/app/registry/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: unknown, fallback: unknown) => fallback);
  mockGetMemberSession.mockResolvedValue(null);
  mockGetMyRegistriesAction.mockResolvedValue({ success: true, registries: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const element = await RegistryPage();
  return render(element);
}

describe("RegistryPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/registry/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("RegistryPage — unauthenticated view", () => {
  it("renders the h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Gift Registry/i }),
    ).toBeInTheDocument();
  });

  it("renders the sign-in prompt body copy", async () => {
    await renderPage();
    expect(
      screen.getByText(/Sign in to create and manage your gift registries/i),
    ).toBeInTheDocument();
  });

  it("renders a sign-in link", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("does not render the registry dashboard", async () => {
    await renderPage();
    expect(screen.queryByTestId("registry-dashboard")).toBeNull();
  });
});

describe("RegistryPage — authenticated view", () => {
  beforeEach(() => {
    mockGetMemberSession.mockResolvedValue({ memberId: "m1", token: "tok" });
  });

  it("renders the h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Gift Registry/i }),
    ).toBeInTheDocument();
  });

  it("renders the intro subhead", async () => {
    await renderPage();
    expect(
      screen.getByText(/Create a shareable wish list for any occasion/i),
    ).toBeInTheDocument();
  });

  it("renders the RegistryDashboard", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("[data-slot='registry-dashboard']")).not.toBeNull();
  });
});

// cfw-dag: owner-editable copy wired to getSiteContent (registry.* keys)
describe("RegistryPage — owner-editable copy (cfw-dag)", () => {
  it("falls back to baked-in copy when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Gift Registry" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to create and manage your gift registries."),
    ).toBeInTheDocument();
  });

  it("uses CMS heading value in unauthenticated view when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "registry.heading") return "My Gift List";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "My Gift List" }),
    ).toBeInTheDocument();
  });

  it("uses CMS heading value in authenticated view when present", async () => {
    mockGetMemberSession.mockResolvedValue({ memberId: "m1", token: "tok" });
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "registry.heading") return "My Gift List";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "My Gift List" }),
    ).toBeInTheDocument();
  });

  it("renders registry.unauthenticated.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "registry.unauthenticated.body")
        return "Log in to start building your registry.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText("Log in to start building your registry."),
    ).toBeInTheDocument();
  });

  it("renders registry.intro.subhead CMS override in authenticated view", async () => {
    mockGetMemberSession.mockResolvedValue({ memberId: "m1", token: "tok" });
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "registry.intro.subhead") return "Build a wish list for any occasion.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText("Build a wish list for any occasion."),
    ).toBeInTheDocument();
  });

  it("queries the 3 expected registry.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "registry.heading",
        "registry.unauthenticated.body",
        "registry.intro.subhead",
      ]),
    );
  });
});
