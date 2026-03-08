import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "apps/user-service/prisma/schema.prisma",
  migrations: {
    path: "apps/user-service/prisma/migrations",
  },
  datasource: {
    url: process.env.USER_DATABASE_URL!,
  },
});
