import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Create the connection pool targeting the local PostgreSQL server
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://enjay@localhost:5432/yachtflow'
});

// Configure Prisma 7 to use the PostgreSQL driver adapter
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
