# ตัวอย่าง E-commerce ด้วย Next.js ที่รองรับ SEO

ร้านค้าออนไลน์ตัวอย่างด้วย **Next.js 16 (App Router)**, React 19 และ TypeScript รวมเทคนิค SEO ที่ร้านค้าจริงควรมี

## เริ่มใช้งาน

```bash
cd ecommerce-seo
npm install
cp .env.example .env.local   # ใส่ NEXT_PUBLIC_SITE_URL เป็นโดเมนจริง
npm run dev                  # http://localhost:3000
npm run build && npm start   # ทดสอบแบบ production
```

> `NEXT_PUBLIC_SITE_URL` ถูกฝังตอน **build** ต้องตั้งค่าก่อน `npm run build` ไม่อย่างนั้น canonical/sitemap จะเป็น `localhost`

## โครงสร้าง

```
src/
├─ app/
│  ├─ layout.tsx                    metadata หลัก, lang="th", JSON-LD Organization + WebSite
│  ├─ page.tsx                      หน้าแรก (ISR)
│  ├─ products/page.tsx             สินค้าทั้งหมด + ItemList JSON-LD
│  ├─ products/[slug]/page.tsx      หน้าสินค้า: generateMetadata, Product JSON-LD, breadcrumb
│  ├─ products/[slug]/opengraph-image.tsx   รูปแชร์โซเชียลอัตโนมัติ (รองรับภาษาไทย)
│  ├─ category/[slug]/page.tsx      หน้าหมวดหมู่
│  ├─ search/page.tsx               ค้นหา (noindex, follow)
│  ├─ sitemap.ts / robots.ts / manifest.ts
│  └─ not-found.tsx                 404 จริง
├─ components/                      ProductCard, Breadcrumbs, AddToCartButton (client)
└─ lib/
   ├─ data.ts                       ข้อมูลจำลอง (เปลี่ยนเป็น DB/CMS/API ได้)
   ├─ jsonld.tsx                    ตัวสร้าง structured data (schema.org)
   └─ site.ts                       ค่าคอนฟิกเว็บ
```

## เทคนิค SEO ที่ใช้

| หัวข้อ | ทำอย่างไร | ไฟล์ |
|---|---|---|
| Server rendering | ทุกหน้าเป็น Server Component → bot เห็น HTML ครบโดยไม่ต้องรัน JS มีแค่ปุ่มตะกร้าที่เป็น client | ทุกหน้า |
| Static + ISR | `generateStaticParams` + `revalidate = 3600` → HTML สร้างล่วงหน้า โหลดเร็ว อัปเดตทุกชั่วโมง | `products/[slug]` |
| Title / description เฉพาะหน้า | `generateMetadata` + title template `%s \| ThaiShop` | `layout.tsx`, `[slug]/page.tsx` |
| Canonical URL | `alternates.canonical` ทุกหน้า + `metadataBase` กัน duplicate content | ทุกหน้า |
| Open Graph / Twitter Card | meta ครบ + รูป OG 1200×630 สร้างอัตโนมัติต่อสินค้า | `opengraph-image.tsx` |
| Rich results | JSON-LD `Product` (ราคา, สต็อก, ดาว, รีวิว), `BreadcrumbList`, `ItemList`, `Organization`, `WebSite` + `SearchAction` | `lib/jsonld.tsx` |
| Sitemap | `/sitemap.xml` สร้างจากข้อมูลสินค้า พร้อม `lastModified` และ image sitemap | `sitemap.ts` |
| robots.txt | กัน `/cart`, `/checkout`, `/account`, `/api/` | `robots.ts` |
| noindex หน้าค้นหา | `robots: { index: false, follow: true }` | `search/page.tsx` |
| HTTP 404 จริง | `notFound()` เมื่อไม่พบสินค้า (ไม่เกิด soft-404) | `[slug]/page.tsx` |
| 301/308 redirect | URL เก่า `/p/:slug` → `/products/:slug` รักษาอันดับเดิม | `next.config.ts` |
| Core Web Vitals | `next/image` (AVIF/WebP, `sizes`, `priority` ให้รูป LCP), CSS ไฟล์เดียว ไม่มี JS ที่ไม่จำเป็น | `ProductCard.tsx` |
| Semantic HTML | `h1` เดียวต่อหน้า, `<nav aria-label>`, `<article>`, `<time>`, `alt` รูปทุกรูป, `lang="th"` | ทุกหน้า |
| Internal linking | breadcrumb, หมวดหมู่ในเมนู, สินค้าที่เกี่ยวข้อง | — |

## ตรวจสอบหลัง deploy

- [Rich Results Test](https://search.google.com/test/rich-results) — ตรวจ JSON-LD ของหน้าสินค้า
- Google Search Console — ส่ง `https://โดเมน/sitemap.xml` และใส่ verification code ใน `layout.tsx`
- PageSpeed Insights / Lighthouse — ตรวจ Core Web Vitals
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — ตรวจรูป OG

## ต่อยอดในโปรเจกต์จริง

- แทน `lib/data.ts` ด้วย Prisma/DB หรือ Headless CMS (Shopify, Medusa, Strapi) แล้วใช้ `revalidatePath()` / `revalidateTag()` ตอนแก้สินค้า
- หลายภาษา: ใช้โฟลเดอร์ `app/[lang]/` + `alternates.languages` (hreflang)
- สินค้าจำนวนมาก: แบ่งหน้าด้วย `?page=` ที่มี canonical ของตัวเอง และใช้ `generateSitemaps()` เมื่อเกิน 50,000 URL
- ตัวเลือกสินค้า (สี/ไซซ์): ใช้ `ProductGroup` + `hasVariant` ใน JSON-LD และให้ canonical ชี้หน้าหลัก
