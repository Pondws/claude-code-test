import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ตัวอย่างใช้รูปจาก picsum — ของจริงเปลี่ยนเป็น CDN ของร้าน
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
    formats: ["image/avif", "image/webp"],
  },
  // ป้องกัน URL ซ้ำ (duplicate content) เช่น /products/ กับ /products
  trailingSlash: false,
  async redirects() {
    return [
      // ตัวอย่าง 301 redirect เมื่อเปลี่ยน URL สินค้าเดิม → รักษาอันดับ SEO
      { source: "/p/:slug", destination: "/products/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
