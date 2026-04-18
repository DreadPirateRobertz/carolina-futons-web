import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      { source: "/futons", destination: "/shop/futon-frames", permanent: true },
      {
        source: "/murphy-beds",
        destination: "/shop/murphy-cabinet-beds",
        permanent: true,
      },
      {
        source: "/mattresses",
        destination: "/shop/mattresses",
        permanent: true,
      },
      { source: "/frames", destination: "/shop/platform-beds", permanent: true },
      { source: "/sale", destination: "/shop/mattresses-sale", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
