import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only allow images from known sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },   // Google profile photos
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
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

  transpilePackages: ['framer-motion'],
};

export default nextConfig;
