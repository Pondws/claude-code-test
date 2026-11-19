import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/site";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="card">
      <Link href={`/products/${product.slug}`}>
        <Image
          src={product.images[0]}
          alt={product.name}
          width={400}
          height={400}
          sizes="(max-width: 640px) 50vw, 25vw"
          priority={priority}
        />
        <h3>{product.name}</h3>
      </Link>
      <p className="muted">{product.brand}</p>
      <p className="price">
        {formatPrice(product.price)}
        {product.compareAtPrice && <s>{formatPrice(product.compareAtPrice)}</s>}
      </p>
      {!product.inStock && <p className="badge">สินค้าหมด</p>}
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid">
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
