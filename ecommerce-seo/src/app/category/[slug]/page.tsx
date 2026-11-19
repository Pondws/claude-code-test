import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductCard";
import { getCategories, getCategory, getProducts } from "@/lib/data";
import { JsonLd, itemListLd } from "@/lib/jsonld";

export const revalidate = 3600;

// pre-render ทุกหมวดหมู่ตอน build
export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} ราคาดี ส่งฟรี`,
    description: category.description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { url: `/category/${slug}`, title: category.name, description: category.description },
  };
}

export default async function CategoryPage({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound(); // ตอบ HTTP 404 จริง ไม่ใช่ soft-404
  const products = await getProducts({ category: slug });

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "หน้าแรก", path: "/" },
          { name: category.name, path: `/category/${slug}` },
        ]}
      />
      <h1>{category.name}</h1>
      <p className="muted">{category.description}</p>
      <ProductGrid products={products} priorityCount={4} />
      <JsonLd data={itemListLd(products)} />
    </>
  );
}
