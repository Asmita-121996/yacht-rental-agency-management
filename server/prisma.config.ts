import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Fallback dummy URL prevents prisma generate from crashing at build time
    // when DATABASE_URL is not yet available (e.g. Railway build phase).
    // The real DATABASE_URL env var is used at runtime.
    url: process.env["DATABASE_URL"] || "postgresql://build:build@localhost:5432/build",
  },
});
