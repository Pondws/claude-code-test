// ข้อมูลจำลอง — ในโปรเจกต์จริงแทนที่ด้วยการเรียก DB / Headless CMS / API
// ฟังก์ชันทั้งหมดเป็น async เพื่อให้เปลี่ยนไปเรียก API จริงได้ทันทีโดยไม่ต้องแก้หน้าเพจ

export type Category = { slug: string; name: string; description: string };

export type Review = { author: string; rating: number; body: string; date: string };

export type Product = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  shortDescription: string;
  description: string;
  images: string[];
  rating: { value: number; count: number };
  reviews: Review[];
  updatedAt: string;
};

const categories: Category[] = [
  { slug: "clothing", name: "เสื้อผ้า", description: "เสื้อยืด เสื้อเชิ้ต และแจ็กเก็ตคุณภาพดี ผ้านุ่ม ใส่สบาย" },
  { slug: "shoes", name: "รองเท้า", description: "รองเท้าผ้าใบ รองเท้าวิ่ง และรองเท้าลำลองสำหรับทุกวัน" },
  { slug: "gadgets", name: "อุปกรณ์ไอที", description: "หูฟัง คีย์บอร์ด และแกดเจ็ตสำหรับคนทำงาน" },
];

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

const products: Product[] = [
  {
    slug: "cotton-tshirt-white",
    sku: "CL-001",
    name: "เสื้อยืดคอตตอน 100% สีขาว",
    brand: "ThaiShop Basic",
    category: "clothing",
    price: 290,
    compareAtPrice: 390,
    inStock: true,
    shortDescription: "เสื้อยืดผ้าคอตตอน 100% นุ่ม ระบายอากาศดี ไม่ย้วยหลังซัก",
    description:
      "เสื้อยืดคอกลมผลิตจากผ้าคอตตอน 100% เนื้อผ้าหนา 180 แกรม ทอแน่น ไม่บาง ใส่สบายในอากาศร้อน ตะเข็บคู่แข็งแรง ซักเครื่องได้ ไม่ย้วย มีไซซ์ S–XXL",
    images: [img("tshirt1"), img("tshirt2")],
    rating: { value: 4.7, count: 128 },
    reviews: [
      { author: "สมชาย", rating: 5, body: "ผ้านุ่มมาก ใส่สบาย ซักแล้วไม่ย้วย", date: "2026-09-12" },
      { author: "มณี", rating: 4, body: "คุ้มราคา ไซซ์ตรงตามตาราง", date: "2026-10-03" },
    ],
    updatedAt: "2026-11-01",
  },
  {
    slug: "denim-jacket",
    sku: "CL-002",
    name: "แจ็กเก็ตยีนส์ทรงโอเวอร์ไซซ์",
    brand: "ThaiShop Studio",
    category: "clothing",
    price: 1290,
    inStock: true,
    shortDescription: "แจ็กเก็ตยีนส์ฟอกสีอ่อน ทรงหลวม ใส่ได้ทั้งชายและหญิง",
    description:
      "แจ็กเก็ตยีนส์ผ้าเดนิม 12 ออนซ์ ฟอกสีอ่อนสไตล์วินเทจ ทรงโอเวอร์ไซซ์ ใส่ได้ทั้งชายและหญิง กระเป๋าหน้าอก 2 ช่อง กระดุมโลหะ",
    images: [img("denim1")],
    rating: { value: 4.5, count: 42 },
    reviews: [{ author: "ปิยะ", rating: 5, body: "ทรงสวย ผ้าดีเกินราคา", date: "2026-08-20" }],
    updatedAt: "2026-10-15",
  },
  {
    slug: "running-shoes-air",
    sku: "SH-001",
    name: "รองเท้าวิ่ง Air Cushion",
    brand: "Stride",
    category: "shoes",
    price: 2490,
    compareAtPrice: 2990,
    inStock: true,
    shortDescription: "รองเท้าวิ่งน้ำหนักเบา พื้นกันกระแทก เหมาะกับการวิ่งระยะไกล",
    description:
      "รองเท้าวิ่งน้ำหนักเพียง 230 กรัม พื้นโฟม Air Cushion คืนแรงดี ลดแรงกระแทกที่ข้อเข่า อัปเปอร์ผ้าตาข่ายระบายอากาศ เหมาะสำหรับวิ่ง 5K–ฮาล์ฟมาราธอน",
    images: [img("shoe1"), img("shoe2")],
    rating: { value: 4.8, count: 311 },
    reviews: [
      { author: "นที", rating: 5, body: "วิ่งฮาล์ฟแล้วไม่เจ็บเท้าเลย", date: "2026-07-01" },
      { author: "Kate", rating: 5, body: "เบามาก นุ่ม", date: "2026-09-30" },
    ],
    updatedAt: "2026-11-10",
  },
  {
    slug: "canvas-sneakers",
    sku: "SH-002",
    name: "รองเท้าผ้าใบแคนวาส สีครีม",
    brand: "Stride",
    category: "shoes",
    price: 890,
    inStock: false,
    shortDescription: "รองเท้าผ้าใบมินิมอล แมตช์ได้กับทุกลุค",
    description:
      "รองเท้าผ้าใบผ้าแคนวาสหนา พื้นยางวัลคาไนซ์ยึดเกาะดี ดีไซน์มินิมอล สีครีมแมตช์ง่ายกับทุกชุด",
    images: [img("sneaker1")],
    rating: { value: 4.3, count: 77 },
    reviews: [],
    updatedAt: "2026-09-05",
  },
  {
    slug: "wireless-earbuds-pro",
    sku: "GD-001",
    name: "หูฟังไร้สาย ANC Pro",
    brand: "SoundMax",
    category: "gadgets",
    price: 1990,
    compareAtPrice: 2590,
    inStock: true,
    shortDescription: "หูฟังตัดเสียงรบกวน ANC แบตอึด 30 ชม. กันน้ำ IPX5",
    description:
      "หูฟัง True Wireless ระบบตัดเสียงรบกวน ANC สูงสุด 35dB บลูทูธ 5.4 เชื่อมต่อเสถียร แบตรวมเคส 30 ชั่วโมง ชาร์จเร็ว 10 นาทีฟังได้ 2 ชั่วโมง กันน้ำ IPX5",
    images: [img("earbuds1"), img("earbuds2")],
    rating: { value: 4.6, count: 205 },
    reviews: [{ author: "ธนา", rating: 5, body: "ตัดเสียงดีมาก นั่งรถไฟฟ้าเงียบสนิท", date: "2026-10-22" }],
    updatedAt: "2026-11-12",
  },
  {
    slug: "mechanical-keyboard-75",
    sku: "GD-002",
    name: "คีย์บอร์ด Mechanical 75% Hot-swap",
    brand: "KeyLab",
    category: "gadgets",
    price: 2790,
    inStock: true,
    shortDescription: "คีย์บอร์ดเมคานิคอล 75% เปลี่ยนสวิตช์ได้ เชื่อมต่อ 3 โหมด",
    description:
      "คีย์บอร์ด Mechanical ขนาด 75% รองรับ Hot-swap เปลี่ยนสวิตช์ได้โดยไม่ต้องบัดกรี เชื่อมต่อได้ทั้ง USB-C, บลูทูธ และ 2.4GHz ไฟ RGB ปุ่มคีย์แคป PBT ภาษาไทย-อังกฤษ",
    images: [img("keyboard1")],
    rating: { value: 4.9, count: 96 },
    reviews: [{ author: "ภูมิ", rating: 5, body: "เสียงพิมพ์ดีมาก งานประกอบแน่น", date: "2026-11-02" }],
    updatedAt: "2026-11-15",
  },
];

export async function getCategories() {
  return categories;
}

export async function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getProducts(opts: { category?: string; q?: string } = {}) {
  const q = opts.q?.trim().toLowerCase();
  return products.filter(
    (p) =>
      (!opts.category || p.category === opts.category) &&
      (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)),
  );
}

export async function getProduct(slug: string) {
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getRelatedProducts(product: Product, limit = 4) {
  return products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, limit);
}
