import Link from "next/link";
import { JsonLd, breadcrumbLd, type Crumb } from "@/lib/jsonld";

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="breadcrumb" className="breadcrumbs">
        <ol>
          {items.map((c, i) => (
            <li key={c.path}>
              {i < items.length - 1 ? <Link href={c.path}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(items)} />
    </>
  );
}
