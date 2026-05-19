import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

console.log(
  "DEBUG: Connection string is:",
  process.env.DATABASE_URL ? "FOUND" : "MISSING"
);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from environment variables.");
}

declare global {
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

export const prismadb =
  globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismadb;
}

export default prismadb;