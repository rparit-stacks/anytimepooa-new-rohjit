import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*'
          },
        ],
      },
    ];
  },
  // Allow local IP addresses
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '192.168.1.11:3000', '127.0.0.1:3000']
    }
  }
};

export default nextConfig;
