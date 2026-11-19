import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

// สร้าง /sitemap.xml อัตโนมัติจากข้อมูลสินค้า
// ถ้าสินค้าเกิน 50,000 รายการ ให้ใช้ generateSitemaps() แบ่งเป็นหลายไฟล์
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images,
    })),
  ];
}
