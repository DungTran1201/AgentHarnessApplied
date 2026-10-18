import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;


