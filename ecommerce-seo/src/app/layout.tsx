import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { JsonLd, organizationLd, websiteLd } from "@/lib/jsonld";
import { getCategories } from "@/lib/data";
import { site } from "@/lib/site";
import "./globals.css";

// metadata ค่าเริ่มต้นของทั้งเว็บ — หน้าย่อย override ได้ผ่าน generateMetadata
export const metadata: Metadata = {
  metadataBase: new URL(site.url), // ทำให้ URL แบบ relative ใน OG/canonical กลายเป็น absolute
  title: { default: `${site.name} — ช้อปออนไลน์ ส่งฟรีทั่วไทย`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: "/",
  },
  twitter: { card: "summary_large_image", site: site.twitter },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  // ใส่ค่าจริงจาก Google Search Console
  verification: { google: "google-site-verification-code" },
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <html lang="th">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              {site.name}
            </Link>
            <nav aria-label="หมวดหมู่สินค้า">
              <Link href="/products">สินค้าทั้งหมด</Link>
              {categories.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`}>
                  {c.name}
                </Link>
              ))}
            </nav>
            {/* ฟอร์ม GET ธรรมดา ทำงานได้แม้ไม่มี JS และสอดคล้องกับ SearchAction ใน JSON-LD */}
            <form action="/search" role="search">
              <input type="search" name="q" placeholder="ค้นหาสินค้า…" aria-label="ค้นหาสินค้า" />
            </form>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer container">
          © {new Date().getFullYear()} {site.name}
        </footer>
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </body>
    </html>
  );
}
