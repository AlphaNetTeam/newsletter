/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served behind nginx: location /markets { proxy_pass http://localhost:20002; }
  // No trailing slash on proxy_pass, so the /markets prefix is forwarded to Next.
  basePath: "/markets",
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
