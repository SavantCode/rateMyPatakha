/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
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