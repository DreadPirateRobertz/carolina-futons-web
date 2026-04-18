import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/media/**",
      },
    ],
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

export default nextConfig;
