import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <h1>ไม่พบหน้าที่คุณต้องการ</h1>
      <p>
        <Link href="/products">ดูสินค้าทั้งหมด</Link>
      </p>
    </section>
  );
}
