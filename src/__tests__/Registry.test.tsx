import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Action mocks ─────────────────────────────────────────────────────────────

const getMyRegistriesAction = vi.fn();
const createRegistryAction = vi.fn();
const deleteRegistryAction = vi.fn();
const markItemPurchasedAction = vi.fn();

vi.mock("@/app/actions/registry", () => ({
  getMyRegistriesAction: (...a: unknown[]) => getMyRegistriesAction(...a),
  createRegistryAction: (...a: unknown[]) => createRegistryAction(...a),
  deleteRegistryAction: (...a: unknown[]) => deleteRegistryAction(...a),
  markItemPurchasedAction: (...a: unknown[]) => markItemPurchasedAction(...a),
}));

import { RegistryDashboard } from "@/components/registry/RegistryDashboard";
import { CreateRegistryForm } from "@/components/registry/CreateRegistryForm";
import { MarkPurchasedButton } from "@/components/registry/MarkPurchasedButton";
import type { RegistrySummary } from "@/lib/registry/registry-types";

function makeRegistry(overrides: Partial<RegistrySummary> = {}): RegistrySummary {
  return {
    _id: "r1",
    title: "Our Wedding Registry",
    slug: "our-wedding-registry-abc123",
    occasion: "wedding",
    eventDate: "2026-09-15",
    isPublic: true,
    itemCount: 3,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMyRegistriesAction.mockResolvedValue({ success: true, registries: [] });
  createRegistryAction.mockResolvedValue({ success: true, registryId: "r1", slug: "test-slug" });
  deleteRegistryAction.mockResolvedValue({ success: true });
  markItemPurchasedAction.mockResolvedValue({ success: true });
});

// ── RegistryDashboard ─────────────────────────────────────────────────────────

describe("RegistryDashboard — empty state", () => {
  it("shows empty message when no registries", () => {
    render(<RegistryDashboard initialRegistries={[]} />);
    expect(screen.getByText(/don't have any registries/i)).toBeInTheDocument();
  });

  it("shows create button", () => {
    render(<RegistryDashboard initialRegistries={[]} />);
    expect(screen.getByRole("button", { name: /create new registry/i })).toBeInTheDocument();
  });
});

describe("RegistryDashboard — with registries", () => {
  it("renders registry title and occasion", () => {
    render(<RegistryDashboard initialRegistries={[makeRegistry()]} />);
    expect(screen.getByText("Our Wedding Registry")).toBeInTheDocument();
    expect(screen.getByText(/Wedding · /)).toBeInTheDocument();
  });

  it("shows item count", () => {
    render(<RegistryDashboard initialRegistries={[makeRegistry({ itemCount: 5 })]} />);
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  it("shows Share button for public registry", () => {
    render(<RegistryDashboard initialRegistries={[makeRegistry({ isPublic: true })]} />);
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("does not show Share button for private registry", () => {
    render(<RegistryDashboard initialRegistries={[makeRegistry({ isPublic: false })]} />);
    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
  });

  it("calls deleteRegistryAction on delete click", async () => {
    render(<RegistryDashboard initialRegistries={[makeRegistry()]} />);
    await userEvent.click(screen.getByRole("button", { name: /delete our wedding registry/i }));
    expect(deleteRegistryAction).toHaveBeenCalledWith("r1");
  });

  it("toggles create form open on button click", async () => {
    render(<RegistryDashboard initialRegistries={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /create new registry/i }));
    expect(screen.getByRole("button", { name: /create registry/i })).toBeInTheDocument();
  });
});

// ── CreateRegistryForm ────────────────────────────────────────────────────────

describe("CreateRegistryForm", () => {
  it("calls createRegistryAction on submit with valid data", async () => {
    const onCreated = vi.fn();
    render(<CreateRegistryForm onCreated={onCreated} />);

    await userEvent.type(
      screen.getByLabelText(/registry name/i),
      "Sarah & Tom's Housewarming",
    );
    await userEvent.click(screen.getByRole("button", { name: /create registry/i }));

    expect(createRegistryAction).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sarah & Tom's Housewarming" }),
    );
    expect(onCreated).toHaveBeenCalledWith("test-slug");
  });

  it("shows error when title is whitespace-only", async () => {
    render(<CreateRegistryForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/registry name/i), "   ");
    await userEvent.click(screen.getByRole("button", { name: /create registry/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/title is required/i);
    expect(createRegistryAction).not.toHaveBeenCalled();
  });

  it("shows server error on action failure", async () => {
    createRegistryAction.mockResolvedValueOnce({ success: false, error: "Registry limit reached" });
    render(<CreateRegistryForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/registry name/i), "My Registry");
    await userEvent.click(screen.getByRole("button", { name: /create registry/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Registry limit reached");
  });
});

// ── MarkPurchasedButton ───────────────────────────────────────────────────────

describe("MarkPurchasedButton — available item", () => {
  it("shows I'm buying this button when remaining > 0", () => {
    render(<MarkPurchasedButton itemId="item-1" remaining={2} />);
    expect(screen.getByRole("button", { name: /buying this/i })).toBeInTheDocument();
  });

  it("calls markItemPurchasedAction on confirm", async () => {
    render(<MarkPurchasedButton itemId="item-1" remaining={2} />);
    await userEvent.click(screen.getByRole("button", { name: /buying this/i }));
    await userEvent.click(screen.getByRole("button", { name: /i'm buying this/i }));
    expect(markItemPurchasedAction).toHaveBeenCalledWith("item-1", "Anonymous", 1);
  });

  it("shows thank you after successful mark", async () => {
    render(<MarkPurchasedButton itemId="item-1" remaining={2} />);
    await userEvent.click(screen.getByRole("button", { name: /buying this/i }));
    await userEvent.click(screen.getByRole("button", { name: /i'm buying this/i }));
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
  });

  it("shows error on failure", async () => {
    markItemPurchasedAction.mockResolvedValueOnce({ success: false, error: "Already purchased" });
    render(<MarkPurchasedButton itemId="item-1" remaining={2} />);
    await userEvent.click(screen.getByRole("button", { name: /buying this/i }));
    await userEvent.click(screen.getByRole("button", { name: /i'm buying this/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Already purchased");
  });
});

describe("MarkPurchasedButton — fully purchased", () => {
  it("shows fully purchased when remaining is 0", () => {
    render(<MarkPurchasedButton itemId="item-1" remaining={0} />);
    expect(screen.getByText(/fully purchased/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
