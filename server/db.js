import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection pool targeting local PostgreSQL instance
const pool = new Pool({
  user: process.env.PGUSER || process.env.USER || 'postgres',
  host: process.env.PGHOST || '127.0.0.1',
  database: process.env.PGDATABASE || 'yachtflow',
  password: process.env.PGPASSWORD || '',
  port: parseInt(process.env.PGPORT || '5432', 10),
});

export default {
  query: (text, params) => pool.query(text, params),
  pool
};
