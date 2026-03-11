import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure native Node server-only libs are not bundled to avoid multi-copy issues
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/secret-manager",
    "google-auth-library",
  ],
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

export default nextConfig;
