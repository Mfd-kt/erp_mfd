import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Force project root when multiple lockfiles exist (e.g. parent ~/package-lock.json) so .env.local resolves from this app. */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
