import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/data";
import { formatPrice, site } from "@/lib/site";

// รูปแชร์ Facebook / LINE / X ของแต่ละสินค้า สร้างอัตโนมัติ (1200x630)
export const alt = "รูปสินค้า";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// โหลดฟอนต์ไทยเฉพาะตัวอักษรที่ใช้ (ฟอนต์เริ่มต้นของ next/og ไม่มีภาษาไทย)
async function loadThaiFont(text: string) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@700&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null; // ถ้าโหลดไม่ได้ ยังสร้างรูปได้ (ตัวไทยอาจไม่แสดง)
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const title = product?.name ?? site.name;
  const price = product ? formatPrice(product.price) : "";
  const font = await loadThaiFont(site.name + title + price);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f766e, #134e4a)",
          color: "white",
          fontSize: 40,
          fontFamily: font ? "Noto Sans Thai" : undefined,
        }}
      >
        <div style={{ display: "flex", fontWeight: 700 }}>{site.name}</div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 56 }}>{price}</div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Noto Sans Thai", data: font, weight: 700 }] : undefined },
  );
}
