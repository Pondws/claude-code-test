import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // หน้าที่ไม่ควรให้ index: ตะกร้า, ชำระเงิน, บัญชี, API
        disallow: ["/cart", "/checkout", "/account", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
