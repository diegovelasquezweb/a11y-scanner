import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => `build-${Date.now()}`,
  serverExternalPackages: ["@diegovelasquezweb/a11y-engine"],
  outputFileTracingIncludes: {
    "/api/*": [
      "./node_modules/@diegovelasquezweb/a11y-engine/assets/**/*",
    ],
  },
};

export default nextConfig;
