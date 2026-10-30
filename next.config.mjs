/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/feed.xml", destination: "/api/v1/feed" }];
  },
  async redirects() {
    return [
      { source: "/contribute", destination: "/donate#contribute", permanent: false },
    ];
  },
};

export default nextConfig;
