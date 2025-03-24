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

  // Exclude development-only pages from the production build
  ...(process.env.NODE_ENV === 'production' && {
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    webpack: (config, { isServer, dev }) => {
      // Create a list of pages that should be excluded from production builds
      const devOnlyPages = [
        /app\/\(auth\)\/signup\/page\.tsx$/,
        // Add other development-only pages here as needed
      ];

      if (!dev && isServer) {
        // Filter out development-only pages during production build
        config.module.rules.push({
          test: (path: string) => {
            return devOnlyPages.some(pattern => pattern.test(path));
          },

        });
      }

      // Rest of your webpack config
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
  }),
  
  // Default webpack config for development
  ...(process.env.NODE_ENV !== 'production' && {
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
  }),
};

export default nextConfig; 