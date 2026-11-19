import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductCard";
import { getProducts } from "@/lib/data";

// หน้าผลค้นหา: noindex เพื่อไม่ให้ Google เก็บหน้าคุณภาพต่ำ/ซ้ำซ้อนจำนวนมาก แต่ยัง follow ลิงก์สินค้า
export const metadata: Metadata = {
  title: "ค้นหาสินค้า",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await getProducts({ q: query }) : [];

  return (
    <>
      <h1>{query ? `ผลการค้นหา “${query}”` : "ค้นหาสินค้า"}</h1>
      {query && results.length === 0 && <p>ไม่พบสินค้าที่ตรงกับคำค้นหา</p>}
      <ProductGrid products={results} />
    </>
  );
}
