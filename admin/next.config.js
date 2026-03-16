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
