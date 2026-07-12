import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const rawDbUrl = process.env.DATABASE_URL;
if (rawDbUrl) {
  try {
    const maskedUrl = rawDbUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`[Database Connection] Active DATABASE_URL: ${maskedUrl}`);
  } catch (err) {
    console.log(`[Database Connection] Active DATABASE_URL is set but could not mask password.`);
  }
} else {
  console.warn(`[Database Connection] WARNING: DATABASE_URL environment variable is undefined! Falling back to localhost.`);
}

// Create the connection pool targeting the local PostgreSQL server
const pool = new pg.Pool({
  connectionString: rawDbUrl || 'postgresql://enjay@localhost:5432/yachtflow'
});

// Configure Prisma 7 to use the PostgreSQL driver adapter
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
