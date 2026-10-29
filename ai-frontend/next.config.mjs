/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.AI_CHAN_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
