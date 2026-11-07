/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.substack.com",
      },
      {
        protocol: "https",
        hostname: "substackcdn.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/patakha-image/[id]": ["./cards/**/*", "./public/cards/**/*"],
      "/api/bg-image": ["./background img/**/*", "./public/background img/**/*"],
      "/api/leaderboard": ["./cards/**/*"],
      "/api/analyze": ["./cards/**/*"],
      "/api/profile": ["./cards/**/*"],
      "/api/vote": ["./cards/**/*"],
      "/api/og": ["./cards/**/*"],
      "/": ["./cards/**/*"],
    },
  },
};

export default nextConfig;