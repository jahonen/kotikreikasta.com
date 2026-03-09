/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      // Ensure Turbopack uses the Hosting workspace as the root
      root: __dirname,
    },
  },
};

module.exports = nextConfig;
