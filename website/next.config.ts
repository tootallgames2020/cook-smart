import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Static export for S3 deployment
  output: 'export',
  trailingSlash: true, // Changed back to true for CloudFront compatibility
  skipTrailingSlashRedirect: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.cooksmartapp.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
