import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure image domains
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/webp'],
  },

  // Production optimizations
  reactStrictMode: true,

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Cache optimization and server components
  experimental: {
    largePageDataBytes: 128 * 1000, // 128KB
    serverActions: {
      allowedOrigins: ['localhost:3000', 'whiisk.app'],
    },
  },

  transpilePackages: ['framer-motion'],

  webpack: (config, { isServer }) => {
    // Resolve `.ts` and `.tsx` extensions for aliases
    config.resolve = config.resolve || {};
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.module.css'];
    
    // Handle .mjs files properly
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    // Handle Node.js modules
    if (!isServer) {
      // Create empty fallback object if it doesn't exist
      config.resolve.fallback = config.resolve.fallback || {};
      
      // Only use NodeJS modules in server components
      Object.assign(config.resolve.fallback, {
        fs: false,
        net: false,
        tls: false,
        path: false,
        util: false,
        crypto: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        os: false,
      });
    }
    
    return config;
  },
};

export default nextConfig;
