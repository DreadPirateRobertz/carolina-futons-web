import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArModelViewer } from "@/components/product/ArModelViewer";
import { resolveGlbUrl, CDN_GLB_BASE } from "@/lib/product/ar-model";

// model-viewer is a custom element — jsdom doesn't define it.
// Register a stub so rendering doesn't throw on unknown element.
beforeAll(() => {
  if (!customElements.get("model-viewer")) {
    class ModelViewerStub extends HTMLElement {}
    customElements.define("model-viewer", ModelViewerStub);
  }
});

// Mock the dynamic import of @google/model-viewer (browser-only package).
vi.mock("@google/model-viewer", () => ({}));

const GLB_URL = "https://cdn.carolinafutons.com/models/glb/asheville-full.glb";

function renderViewer(props?: Partial<Parameters<typeof ArModelViewer>[0]>) {
  return render(
    <ArModelViewer glbUrl={GLB_URL} productName="Asheville Full Futon" {...props} />
  );
}

// ── resolveGlbUrl utility ─────────────────────────────────────────────────────

describe("resolveGlbUrl", () => {
  it("constructs CDN URL from product slug", () => {
    expect(resolveGlbUrl("asheville-full")).toBe(
      `${CDN_GLB_BASE}/asheville-full.glb`
    );
  });

  it("handles slugs with hyphens", () => {
    expect(resolveGlbUrl("blue-ridge-queen")).toBe(
      `${CDN_GLB_BASE}/blue-ridge-queen.glb`
    );
  });

  it("returns null for empty slug", () => {
    expect(resolveGlbUrl("")).toBeNull();
  });

  it("returns null for whitespace-only slug", () => {
    expect(resolveGlbUrl("   ")).toBeNull();
  });

  it("trims slug before building URL", () => {
    expect(resolveGlbUrl("  mesa-twin  ")).toBe(
      `${CDN_GLB_BASE}/mesa-twin.glb`
    );
  });
});

// ── ArModelViewer component ───────────────────────────────────────────────────

describe("ArModelViewer", () => {
  describe("mobile-only wrapper", () => {
    it("renders the AR section with aria-label", () => {
      renderViewer();
      expect(screen.getByRole("region", { name: /view in your room/i })).toBeInTheDocument();
    });

    it("applies md:hidden so the section is hidden on desktop", () => {
      renderViewer();
      const section = screen.getByRole("region", { name: /view in your room/i });
      expect(section.className).toMatch(/md:hidden/);
    });
  });

  describe("model-viewer element", () => {
    it("renders a model-viewer element", () => {
      renderViewer();
      expect(document.querySelector("model-viewer")).toBeInTheDocument();
    });

    it("sets src attribute to the provided glbUrl", () => {
      renderViewer();
      expect(document.querySelector("model-viewer")).toHaveAttribute("src", GLB_URL);
    });

    it("sets ar attribute to enable AR mode", () => {
      renderViewer();
      expect(document.querySelector("model-viewer")).toHaveAttribute("ar");
    });

    it("sets camera-controls attribute", () => {
      renderViewer();
      expect(document.querySelector("model-viewer")).toHaveAttribute("camera-controls");
    });

    it("sets auto-rotate attribute", () => {
      renderViewer();
      expect(document.querySelector("model-viewer")).toHaveAttribute("auto-rotate");
    });

    it("sets alt text incorporating productName", () => {
      renderViewer();
      const mv = document.querySelector("model-viewer");
      expect(mv?.getAttribute("alt")).toMatch(/Asheville Full Futon/);
    });

    it("sets alt text without productName when omitted", () => {
      renderViewer({ productName: undefined });
      const mv = document.querySelector("model-viewer");
      expect(mv?.getAttribute("alt")).toBeTruthy();
    });

    it("sets ar-modes attribute for cross-platform AR", () => {
      renderViewer();
      const mv = document.querySelector("model-viewer");
      expect(mv?.getAttribute("ar-modes")).toBeTruthy();
    });
  });

  describe("AR button", () => {
    it("renders 'View in your room' button inside model-viewer", () => {
      renderViewer();
      expect(
        screen.getByRole("button", { name: /view in your room/i })
      ).toBeInTheDocument();
    });

    it("AR button is slotted into ar-button slot", () => {
      renderViewer();
      const btn = screen.getByRole("button", { name: /view in your room/i });
      expect(btn).toHaveAttribute("slot", "ar-button");
    });
  });

  describe("app download CTA", () => {
    it("renders the app download CTA section", () => {
      renderViewer();
      expect(screen.getByRole("region", { name: /download our app/i })).toBeInTheDocument();
    });

    it("renders App Store link with href='#'", () => {
      renderViewer();
      const link = screen.getByRole("link", { name: /app store/i });
      expect(link).toHaveAttribute("href", "#");
    });

    it("renders Google Play link with href='#'", () => {
      renderViewer();
      const link = screen.getByRole("link", { name: /google play/i });
      expect(link).toHaveAttribute("href", "#");
    });

    it("renders CTA text about app", () => {
      renderViewer();
      expect(screen.getByText(/download our app/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("model-viewer has a non-empty alt attribute", () => {
      renderViewer();
      const mv = document.querySelector("model-viewer");
      expect(mv?.getAttribute("alt")).toBeTruthy();
    });

    it("App Store link has accessible name", () => {
      renderViewer();
      expect(screen.getByRole("link", { name: /app store/i })).toBeInTheDocument();
    });

    it("Google Play link has accessible name", () => {
      renderViewer();
      expect(screen.getByRole("link", { name: /google play/i })).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders without crashing when glbUrl is an empty string", () => {
      expect(() => renderViewer({ glbUrl: "" })).not.toThrow();
    });

    it("renders without crashing when productName is undefined", () => {
      expect(() => renderViewer({ productName: undefined })).not.toThrow();
    });

    it("renders without crashing when productName is an empty string", () => {
      expect(() => renderViewer({ productName: "" })).not.toThrow();
    });

    it("handles very long product names without layout-breaking attributes", () => {
      const longName = "A".repeat(200);
      expect(() => renderViewer({ productName: longName })).not.toThrow();
      const mv = document.querySelector("model-viewer");
      expect(mv?.getAttribute("alt")).toContain(longName);
    });

    it("handles special characters in glbUrl", () => {
      const specialUrl = "https://cdn.carolinafutons.com/models/glb/product%20name.glb";
      renderViewer({ glbUrl: specialUrl });
      expect(document.querySelector("model-viewer")).toHaveAttribute("src", specialUrl);
    });
  });
});
