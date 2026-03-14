import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => `build-${Date.now()}`,
  outputFileTracingIncludes: {
    "/api/*": [
      "./node_modules/@diegovelasquezweb/a11y-engine/assets/**/*",
    ],
  },
};

export default nextConfig;
