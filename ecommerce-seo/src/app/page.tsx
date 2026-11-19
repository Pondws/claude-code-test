import Link from "next/link";
import { ProductGrid } from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/data";

// ISR: สร้างเป็น static HTML และรีเฟรชทุก 1 ชม. → โหลดเร็ว (Core Web Vitals ดี) + bot อ่าน HTML ได้ครบ
export const revalidate = 3600;

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <>
      <section className="hero">
        {/* มี h1 เดียวต่อหน้า */}
        <h1>ช้อปเสื้อผ้า รองเท้า และแกดเจ็ต ส่งฟรีทั่วไทย</h1>
        <p>สินค้าคุณภาพ ราคาดี รับประกันคืนเงินภายใน 30 วัน</p>
      </section>

      <section>
        <h2>หมวดหมู่ยอดนิยม</h2>
        <ul className="chips">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>สินค้าแนะนำ</h2>
        <ProductGrid products={products.slice(0, 4)} priorityCount={2} />
      </section>
    </>
  );
}
