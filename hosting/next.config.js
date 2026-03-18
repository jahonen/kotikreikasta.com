/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-only native libs are not bundled into route chunks
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/secret-manager',
    'google-auth-library',
  ],
  images: {
    // Serve original images without going through Next's optimizer route
    unoptimized: true,
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
};

module.exports = nextConfig;
