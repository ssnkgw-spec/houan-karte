import type { NextConfig } from "next";

// 純静的サイト（output: export）。サーバー関数・実行時シークレット・DBはゼロ。
// セキュリティヘッダーは静的エクスポートでは next 側で付与できないため vercel.json で設定する。
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
