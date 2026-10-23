import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Eliminamos el basePath para que la app funcione en la raíz del puerto 3000
  basePath: "",

  // 2. Mantenemos las Server Actions habilitadas para tu IP
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.0.102:3000", "localhost:3000"],
    },
  },

  // 3. Permitimos conexiones desde cualquier dispositivo de tu red
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.102",
    "192.168.*.*",
  ],

  // 4. CORS configuration for cross-origin requests
  // Allow API routes to be accessed from remote PCs on the same local network
  // Note: This is for development only. In production, restrict to specific origins.
  async headers() {
    return [
      {
        source: "/api/(.*)/upload",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-file-name, x-chunk-index, x-total-chunks, x-folder-name, x-upload-id, x-replace-media" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/api/media",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },

  // 5. Configure to serve static files from network-accessible location
  // This ensures uploaded media can be accessed from remote PCs
  // Note: In production, use a proper network storage solution
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/videos/**",
      },
      {
        protocol: "http",
        hostname: "192.168.*.*",
        port: "3000",
        pathname: "/api/videos/**",
      },
      {
        protocol: "https",
        hostname: "192.168.*.*",
        port: "3000",
        pathname: "/api/videos/**",
      },
    ],
  },

};

export default nextConfig;
