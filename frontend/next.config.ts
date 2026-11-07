import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents/partialPrefetching (Next 16 canary caching model) are off:
  // every route is authenticated and renders per-user data at request time,
  // so there is nothing to statically cache. Auth via cookies() already forces
  // dynamic rendering; `export const dynamic` in (app)/layout is the explicit guard.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
