import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductCard";
import { getCategory, getProduct, getProducts, getRelatedProducts } from "@/lib/data";
import { JsonLd, productLd } from "@/lib/jsonld";
import { formatPrice } from "@/lib/site";

export const revalidate = 3600;
// slug ที่ไม่ได้ pre-render ตอน build จะถูกสร้างตอนมีคนเข้าครั้งแรก (แล้ว cache)
export const dynamicParams = true;

// generateMetadata กับ page เรียกข้อมูลเดียวกัน → ใช้ cache() ให้ query เพียงครั้งเดียวต่อ request
const loadProduct = cache(getProduct);

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "ไม่พบสินค้า", robots: { index: false } };

  const title = `${product.name} ราคา ${formatPrice(product.price)}`;
  return {
    title,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      url: `/products/${product.slug}`,
      title,
      description: product.shortDescription,
      // รูป OG สร้างอัตโนมัติจาก opengraph-image.tsx ในโฟลเดอร์เดียวกัน
    },
    other: {
      // meta สำหรับ Facebook / Pinterest product pins
      "product:price:amount": product.price.toFixed(2),
      "product:price:currency": "THB",
      "product:availability": product.inStock ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const [category, related] = await Promise.all([getCategory(product.category), getRelatedProducts(product)]);

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "หน้าแรก", path: "/" },
          ...(category ? [{ name: category.name, path: `/category/${category.slug}` }] : []),
          { name: product.name, path: `/products/${product.slug}` },
        ]}
      />

      <article className="product">
        <div className="gallery">
          {product.images.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`${product.name} รูปที่ ${i + 1}`}
              width={800}
              height={800}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={i === 0} // รูปหลักคือ LCP → โหลดก่อน
            />
          ))}
        </div>

        <div className="info">
          <p className="muted">{product.brand}</p>
          <h1>{product.name}</h1>
          <p className="rating" aria-label={`คะแนน ${product.rating.value} จาก 5`}>
            ★ {product.rating.value} ({product.rating.count} รีวิว)
          </p>
          <p className="price big">
            {formatPrice(product.price)}
            {product.compareAtPrice && <s>{formatPrice(product.compareAtPrice)}</s>}
          </p>
          <p>{product.inStock ? "✅ มีสินค้า พร้อมส่ง" : "❌ สินค้าหมดชั่วคราว"}</p>
          <AddToCartButton sku={product.sku} disabled={!product.inStock} />

          <h2>รายละเอียดสินค้า</h2>
          <p>{product.description}</p>
          <p className="muted">รหัสสินค้า: {product.sku}</p>
        </div>
      </article>

      {product.reviews.length > 0 && (
        <section>
          <h2>รีวิวจากลูกค้า</h2>
          {product.reviews.map((r) => (
            <blockquote key={r.author + r.date} className="review">
              <strong>
                {"★".repeat(r.rating)} {r.author}
              </strong>{" "}
              <time dateTime={r.date}>{new Date(r.date).toLocaleDateString("th-TH")}</time>
              <p>{r.body}</p>
            </blockquote>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section>
          {/* internal links ไปสินค้าที่เกี่ยวข้อง ช่วยให้ bot crawl ได้ทั่วถึง */}
          <h2>สินค้าที่เกี่ยวข้อง</h2>
          <ProductGrid products={related} />
        </section>
      )}

      <JsonLd data={productLd(product)} />
    </>
  );
}
