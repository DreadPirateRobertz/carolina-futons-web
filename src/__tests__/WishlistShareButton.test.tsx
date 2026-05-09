import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  generateShareToken: vi.fn(),
}));

vi.mock("@/app/actions/wishlist", () => ({
  generateShareToken: actionMocks.generateShareToken,
}));

import { WishlistShareButton } from "@/components/member/WishlistShareButton";

const writeText = vi.fn();

beforeEach(() => {
  actionMocks.generateShareToken.mockReset();
  writeText.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  // shouldAdvanceTime: true lets RTL's waitFor polling (via setTimeout) still
  // fire while we retain manual control over the 3s reset timer.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WishlistShareButton", () => {
  it("renders 'Share wishlist' in idle state", () => {
    render(<WishlistShareButton />);
    expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent(
      "Share wishlist",
    );
  });

  it("renders nothing when loadFailed is true", () => {
    const { container } = render(<WishlistShareButton loadFailed />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'Generating…' and disables button while pending", async () => {
    actionMocks.generateShareToken.mockReturnValue(new Promise(() => {})); // never resolves
    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));
    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Generating…"),
    );
    expect(screen.getByTestId("wishlist-share-button")).toBeDisabled();
  });

  it("shows 'Link copied!' after successful token + clipboard write", async () => {
    actionMocks.generateShareToken.mockResolvedValueOnce({
      success: true,
      token: "abc.def",
    });
    writeText.mockResolvedValueOnce(undefined);

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Link copied!"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/wishlist-share/abc.def"),
    );
  });

  it("resets to 'Share wishlist' after 3 s following copy", async () => {
    actionMocks.generateShareToken.mockResolvedValueOnce({
      success: true,
      token: "tok",
    });
    writeText.mockResolvedValueOnce(undefined);

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Link copied!"),
    );

    act(() => vi.advanceTimersByTime(3000));

    expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent(
      "Share wishlist",
    );
  });

  it("shows 'Try again' when generateShareToken returns success:false", async () => {
    actionMocks.generateShareToken.mockResolvedValueOnce({ success: false });

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Try again"),
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shows 'Try again' when clipboard.writeText rejects", async () => {
    actionMocks.generateShareToken.mockResolvedValueOnce({
      success: true,
      token: "tok",
    });
    writeText.mockRejectedValueOnce(new DOMException("NotAllowedError"));

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Try again"),
    );
  });

  it("resets to 'Share wishlist' after 3 s following error", async () => {
    actionMocks.generateShareToken.mockResolvedValueOnce({ success: false });

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Try again"),
    );

    act(() => vi.advanceTimersByTime(3000));

    expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent(
      "Share wishlist",
    );
  });

  it("ignores second click while already pending", async () => {
    let resolveToken!: (v: unknown) => void;
    actionMocks.generateShareToken.mockReturnValueOnce(
      new Promise((res) => { resolveToken = res; }),
    );

    render(<WishlistShareButton />);
    fireEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Generating…"),
    );

    // Second click while pending should be no-op
    fireEvent.click(screen.getByTestId("wishlist-share-button"));
    expect(actionMocks.generateShareToken).toHaveBeenCalledTimes(1);

    // Resolve so the component settles
    writeText.mockResolvedValueOnce(undefined);
    act(() => { resolveToken({ success: true, token: "t" }); });
    await waitFor(() =>
      expect(screen.getByTestId("wishlist-share-button")).toHaveTextContent("Link copied!"),
    );
  });
});
