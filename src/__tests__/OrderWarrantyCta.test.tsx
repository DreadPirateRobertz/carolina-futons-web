// cfw-lgc: OrderWarrantyCta — banner shown on /order-confirmation to
// nudge buyers to register their warranty. Tests pin URL composition
// (encoding + omitted optional fields), guard-rendering (no orderId),
// and the accessible CTA link target.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OrderWarrantyCta } from "@/components/order/OrderWarrantyCta";

describe("OrderWarrantyCta — render", () => {
  it("renders nothing when orderId is missing", () => {
    const { container } = render(<OrderWarrantyCta orderId="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when orderId is whitespace only", () => {
    const { container } = render(<OrderWarrantyCta orderId="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the CTA banner with heading + copy + register link when orderId is present", () => {
    render(<OrderWarrantyCta orderId="order-1" />);
    expect(
      screen.getByRole("heading", { name: /register your warranty/i }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /register warranty/i });
    expect(link).toBeInTheDocument();
  });
});

describe("OrderWarrantyCta — link composition", () => {
  it("forwards orderId as a query param on /warranty/register", () => {
    render(<OrderWarrantyCta orderId="order-1" />);
    const link = screen.getByRole("link", { name: /register warranty/i });
    expect(link.getAttribute("href")).toBe(
      "/warranty/register?orderId=order-1",
    );
  });

  it("forwards productId + productName when provided", () => {
    render(
      <OrderWarrantyCta
        orderId="order-1"
        productId="p-1"
        productName="Carolina Classic Futon"
      />,
    );
    const link = screen.getByRole("link", { name: /register warranty/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("orderId=order-1");
    expect(href).toContain("productId=p-1");
    expect(href).toContain("productName=Carolina+Classic+Futon");
  });

  it("URL-encodes special characters in productName", () => {
    render(
      <OrderWarrantyCta
        orderId="order-1"
        productId="p-1"
        productName="Cody — Loveseat & Mattress"
      />,
    );
    const link = screen.getByRole("link", { name: /register warranty/i });
    const href = link.getAttribute("href") ?? "";
    // URLSearchParams encodes & as the param separator, em-dash as %E2%80%94
    // and space as +. Test asserts the productName slot contains all three
    // safely separated so '&' inside the value doesn't break param parsing.
    expect(href).toMatch(/productName=Cody.*Loveseat.*Mattress/);
    expect(href).not.toMatch(/productName=Cody — Loveseat & Mattress/);
  });

  it("URL-encodes orderId that contains slashes or spaces", () => {
    render(<OrderWarrantyCta orderId="order/1 weird" />);
    const link = screen.getByRole("link", { name: /register warranty/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).not.toContain("order/1 weird"); // raw form must be escaped
    expect(href).toContain("orderId=order%2F1+weird");
  });

  it("omits productId param when productName is provided alone", () => {
    render(
      <OrderWarrantyCta
        orderId="order-1"
        productName="Carolina Classic Futon"
      />,
    );
    const link = screen.getByRole("link", { name: /register warranty/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("productName=");
    expect(href).not.toContain("productId=");
  });

  it("omits productName param when productId is provided alone", () => {
    render(<OrderWarrantyCta orderId="order-1" productId="p-1" />);
    const link = screen.getByRole("link", { name: /register warranty/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("productId=p-1");
    expect(href).not.toContain("productName=");
  });
});
