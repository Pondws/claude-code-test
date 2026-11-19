export const site = {
  name: "ThaiShop",
  description:
    "ร้านค้าออนไลน์ตัวอย่าง ขายเสื้อผ้า รองเท้า และอุปกรณ์ไอที ราคาดี ส่งฟรีทั่วไทย",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "th_TH",
  currency: "THB",
  twitter: "@thaishop",
  logo: "/logo.svg",
} as const;

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: site.currency }).format(value);
