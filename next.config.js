/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Lets the API test suite run its own `next dev` instance against a
  // separate build directory, so it never collides with a developer's own
  // `npm run dev` sharing the same .next folder.
  distDir: process.env.ATHARX_TEST_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

module.exports = nextConfig;
