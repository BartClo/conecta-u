import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija el modo en build. Sin esto, un NEXT_PUBLIC_* ausente al compilar se lee
  // en runtime en el servidor y el env de un build normal podria activar el modo test.
  env: {
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase",
  },
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
