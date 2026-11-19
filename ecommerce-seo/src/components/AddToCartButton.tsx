"use client";

// ส่วน interactive เท่านั้นที่เป็น Client Component — เนื้อหาหลักยังเรนเดอร์ฝั่งเซิร์ฟเวอร์ (ดีต่อ SEO)
import { useState } from "react";

export function AddToCartButton({ sku, disabled }: { sku: string; disabled: boolean }) {
  const [added, setAdded] = useState(false);
  return (
    <button
      className="btn"
      disabled={disabled}
      onClick={() => {
        // TODO: เรียก Server Action / API ตะกร้าสินค้าจริง
        console.log("add to cart", sku);
        setAdded(true);
      }}
    >
      {disabled ? "สินค้าหมด" : added ? "เพิ่มลงตะกร้าแล้ว ✓" : "เพิ่มลงตะกร้า"}
    </button>
  );
}
