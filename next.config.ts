import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow large file uploads (PDFs)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
