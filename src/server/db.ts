import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as { nawaDb?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const db = globalForDb.nawaDb ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForDb.nawaDb = db;
