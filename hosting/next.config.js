/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-only native libs are not bundled into route chunks
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/secret-manager',
    'google-auth-library',
  ],
  images: {
    // Serve original images without going through Next's optimizer route
    unoptimized: true,
  },
};

module.exports = nextConfig;
