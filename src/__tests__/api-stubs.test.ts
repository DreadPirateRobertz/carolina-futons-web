import { describe, it, expect } from "vitest";

type HandlerName = "GET" | "POST" | "DELETE";

// Each entry imports the route module and lists the HTTP methods it exports.
// The module may also export non-handler values (e.g. `dynamic`), so we type
// the import result loosely and narrow when invoking.
const stubRoutes: Array<{
  path: string;
  methods: HandlerName[];
  load: () => Promise<Record<string, unknown>>;
}> = [
  {
    path: "/api/contact",
    methods: ["POST"],
    load: () => import("@/app/api/contact/route"),
  },
  {
    path: "/api/newsletter",
    methods: ["POST"],
    load: () => import("@/app/api/newsletter/route"),
  },
  {
    path: "/api/delivery-zone",
    methods: ["GET", "POST"],
    load: () => import("@/app/api/delivery-zone/route"),
  },
  {
    path: "/api/cart",
    methods: ["GET", "POST", "DELETE"],
    load: () => import("@/app/api/cart/route"),
  },
  {
    path: "/api/wishlist",
    methods: ["GET", "POST", "DELETE"],
    load: () => import("@/app/api/wishlist/route"),
  },
  {
    path: "/api/search",
    methods: ["GET"],
    load: () => import("@/app/api/search/route"),
  },
  {
    path: "/api/order-lookup",
    methods: ["POST"],
    load: () => import("@/app/api/order-lookup/route"),
  },
];

describe("not-implemented API stubs", () => {
  for (const { path, methods, load } of stubRoutes) {
    for (const method of methods) {
      it(`${method} ${path} returns 501 with not-implemented error`, async () => {
        const mod = await load();
        const handler = mod[method] as () => Promise<Response>;
        expect(typeof handler).toBe("function");
        const res = await handler();
        expect(res.status).toBe(501);
        const json = (await res.json()) as { ok: boolean; error: string };
        expect(json.ok).toBe(false);
        expect(json.error).toBe("not-implemented");
      });
    }
  }
});
