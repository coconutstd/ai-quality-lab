import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright가 127.0.0.1로 접근할 때 Next 16이 cross-origin HMR 요청을 막지 않도록.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
