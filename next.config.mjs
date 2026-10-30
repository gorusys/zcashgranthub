/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/contribute", destination: "/donate#contribute", permanent: false },
    ];
  },
};

export default nextConfig;
