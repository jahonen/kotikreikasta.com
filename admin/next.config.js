/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/secret-manager",
    "google-auth-library",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  // Optimize build performance
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Reduce build output
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/assets/favicon/favicon.ico",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
