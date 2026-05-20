import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@daveyplate/better-auth-ui",
      "@lexical/react",
      "framer-motion",
      "radix-ui",
      "streamdown",
    ],
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
