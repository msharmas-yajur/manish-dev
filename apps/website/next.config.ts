import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8082',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.caladrius.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/wp-api/:path*',
        destination: `${process.env.WORDPRESS_API_URL || 'http://localhost:8082/wp-json'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
