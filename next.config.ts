import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // 将 Prisma Client 与引擎库显式包含到所有 app 路由 API 的 serverless 函数包中（Next 16 顶层字段）
  outputFileTracingIncludes: {
    "src/app/api/**": [
      "node_modules/@prisma/client/**",
      "node_modules/.prisma/**",
    ],
  },
};

export default nextConfig;
