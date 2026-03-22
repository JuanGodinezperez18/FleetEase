
// next.config.mjs
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/fleetease-manager.appspot.com/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/fleetease-manager.firebasestorage.app/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/fleetease-manager.appspot.com/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/fleetease-manager.firebasestorage.app/**' },
      // fail-safe para otros buckets firmados si usas varios:
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
    ],
  },
  // Enable Turbopack (default in Next.js 16)
  turbopack: {},
};
export default nextConfig;
