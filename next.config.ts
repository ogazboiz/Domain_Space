import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration for XMTP Browser SDK
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
      
      // Enable WebAssembly support for XMTP
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        syncWebAssembly: true,
      };

      // XMTP Browser SDK specific optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            xmtp: {
              test: /[\\/]node_modules[\\/]@xmtp[\\/]/,
              name: 'xmtp',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Ensure proper handling of ES modules
  transpilePackages: ['@xmtp/browser-sdk', '@xmtp/wasm-bindings'],
};

export default nextConfig;
