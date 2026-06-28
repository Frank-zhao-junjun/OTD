import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['*.dev.coze.site'],

};

export default nextConfig;
