import { absoluteUrl, site } from "./site";
import type { Product } from "./data";

/**
 * แสดง structured data (JSON-LD) ให้ Google อ่าน
 * escape "<" เพื่อกัน XSS กรณีข้อมูลมี </script>
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  logo: absoluteUrl(site.logo),
});

// ทำให้ Google แสดงช่องค้นหาในผลการค้นหา (Sitelinks search box)
export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.url,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export type Crumb = { name: string; path: string };

export const breadcrumbLd = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.path),
  })),
});

// Product rich result: ราคา, สต็อก, ดาวรีวิว แสดงบนหน้าผลค้นหา Google
export const productLd = (p: Product) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  description: p.description,
  sku: p.sku,
  image: p.images,
  brand: { "@type": "Brand", name: p.brand },
  url: absoluteUrl(`/products/${p.slug}`),
  offers: {
    "@type": "Offer",
    url: absoluteUrl(`/products/${p.slug}`),
    priceCurrency: site.currency,
    price: p.price.toFixed(2),
    availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: site.name },
  },
  ...(p.rating.count > 0 && {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating.value,
      reviewCount: p.rating.count,
    },
  }),
  ...(p.reviews.length > 0 && {
    review: p.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewBody: r.body,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
    })),
  }),
});

// ItemList สำหรับหน้ารวมสินค้า/หมวดหมู่
export const itemListLd = (products: Product[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: absoluteUrl(`/products/${p.slug}`),
    name: p.name,
  })),
});
