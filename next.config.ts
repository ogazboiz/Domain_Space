import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // XMTP configuration for client-side
      config.externals = config.externals || [];
      config.externals.push({
        '@xmtp/wasm-bindings': '@xmtp/wasm-bindings',
      });

      // Handle XMTP modules
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };

      // Optimize XMTP dependencies
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        xmtp: {
          name: 'xmtp',
          test: /[\\/]node_modules[\\/]@xmtp[\\/]/,
          chunks: 'all',
          priority: 30,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
