import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback lets `prisma generate` run (e.g. in Docker builds) without a database URL.
    url: process.env["DATABASE_URL"] ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
});
