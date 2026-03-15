import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => `build-${Date.now()}`,
  serverExternalPackages: ["@diegovelasquezweb/a11y-engine"],
};

export default nextConfig;
