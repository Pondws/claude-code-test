import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductCard";
import { getProducts } from "@/lib/data";
import { JsonLd, itemListLd } from "@/lib/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "สินค้าทั้งหมด",
  description: "รวมสินค้าทั้งหมดของร้าน เสื้อผ้า รองเท้า และอุปกรณ์ไอที ราคาดี ส่งฟรี",
  alternates: { canonical: "/products" },
  openGraph: { url: "/products" },
};

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "หน้าแรก", path: "/" },
          { name: "สินค้าทั้งหมด", path: "/products" },
        ]}
      />
      <h1>สินค้าทั้งหมด</h1>
      <ProductGrid products={products} priorityCount={4} />
      <JsonLd data={itemListLd(products)} />
    </>
  );
}
