import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Production optimizations
  reactStrictMode: true,

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Server actions config
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'syft.app', 'syft.cooking', 'bs-local.com:3000', 'bs-local.com'],
    },
  },

  // Allow cross-origin requests for authentication
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  transpilePackages: ['framer-motion'],
};

export default nextConfig;
