import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma", // Path to your Prisma schema file
  datasource: {
    url: env("DATABASE_URL"), // Your database connection URL from .env
  },
});