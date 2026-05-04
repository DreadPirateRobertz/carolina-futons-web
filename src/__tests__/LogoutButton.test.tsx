import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

import { LogoutButton } from "@/components/member/LogoutButton";

beforeEach(() => {
  routerMocks.push.mockReset();
  routerMocks.refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mockFetch = () => vi.mocked(global.fetch);

describe("<LogoutButton />", () => {
  it("renders a Sign out button", () => {
    render(<LogoutButton />);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Signing out…' while the request is in flight", async () => {
    let resolve!: (value: Response) => void;
    mockFetch().mockReturnValue(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(/signing out/i),
    );

    resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  it("navigates to / when DELETE succeeds without logoutUrl", async () => {
    mockFetch().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/"));
    expect(routerMocks.refresh).toHaveBeenCalled();
  });

  it("calls DELETE /api/auth/session and does not navigate via router when logoutUrl is returned", async () => {
    const logoutUrl = "https://users.wix.com/logout?redirectTo=https%3A%2F%2Fexample.com";
    mockFetch().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, logoutUrl }), { status: 200 }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() =>
      expect(mockFetch()).toHaveBeenCalledWith("/api/auth/session", {
        method: "DELETE",
      }),
    );
    // router.push is NOT called when logoutUrl is present — the component
    // uses window.location.href for the Wix-hosted logout redirect instead.
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("shows an error message when DELETE returns a non-ok response", async () => {
    mockFetch().mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /could not sign out/i,
      ),
    );
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("shows an error message when fetch throws", async () => {
    mockFetch().mockRejectedValue(new Error("Network error"));

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /could not sign out/i,
      ),
    );
  });

  it("disables the button while pending", async () => {
    let resolve!: (value: Response) => void;
    mockFetch().mockReturnValue(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );

    render(<LogoutButton />);
    const btn = screen.getByTestId("logout-button");
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());

    resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });
});
