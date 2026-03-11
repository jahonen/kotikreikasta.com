/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-only native libs are not bundled into route chunks
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/secret-manager',
    'google-auth-library',
  ],
};

module.exports = nextConfig;
