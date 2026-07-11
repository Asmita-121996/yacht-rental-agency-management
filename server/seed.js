import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Client, Pool } = pg;

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

async function ensureDatabaseExists() {
  const pgUser = process.env.PGUSER || process.env.USER || 'postgres';
  const pgHost = process.env.PGHOST || '127.0.0.1';
  const pgPassword = process.env.PGPASSWORD || '';
  const pgPort = parseInt(process.env.PGPORT || '5432', 10);
  const targetDb = process.env.PGDATABASE || 'yachtflow';

  console.log(`Connecting to default 'postgres' database on ${pgHost}:${pgPort} to check if database '${targetDb}' exists...`);
  
  const client = new Client({
    user: pgUser,
    host: pgHost,
    database: 'postgres',
    password: pgPassword,
    port: pgPort,
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
    
    if (res.rowCount === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating database...`);
      // CREATE DATABASE cannot run inside a transaction block, pg library supports direct execution
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Database '${targetDb}' created successfully.`);
    } else {
      console.log(`Database '${targetDb}' already exists.`);
    }
  } catch (err) {
    console.error("Error checking/creating database:", err.message);
    console.log("Proceeding to connect directly to the database. Make sure it is created.");
  } finally {
    await client.end();
  }
}

async function runSeed() {
  await ensureDatabaseExists();

  const pgUser = process.env.PGUSER || process.env.USER || 'postgres';
  const pgHost = process.env.PGHOST || '127.0.0.1';
  const pgPassword = process.env.PGPASSWORD || '';
  const pgPort = parseInt(process.env.PGPORT || '5432', 10);
  const targetDb = process.env.PGDATABASE || 'yachtflow';

  console.log(`Connecting directly to database '${targetDb}' to run table schemas and seed defaults...`);
  const pool = new Pool({
    user: pgUser,
    host: pgHost,
    database: targetDb,
    password: pgPassword,
    port: pgPort,
  });

  try {
    // Read schema.sql
    const __dirname = path.resolve();
    const schemaPath = path.join(__dirname, 'server', 'schema.sql');
    console.log(`Reading SQL schema file from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run schemas
    await pool.query(schemaSql);
    console.log("Table schemas created successfully.");

    // Clean existing tables to prevent key duplicate conflicts on seed runs
    console.log("Cleaning existing database records for fresh seed...");
    await pool.query(`TRUNCATE TABLE bookings CASCADE`);
    await pool.query(`TRUNCATE TABLE sessions CASCADE`);
    await pool.query(`TRUNCATE TABLE yachts CASCADE`);
    await pool.query(`TRUNCATE TABLE users CASCADE`);
    await pool.query(`TRUNCATE TABLE system_defaults CASCADE`);

    // 1. Seed users
    console.log("Seeding default user accounts...");
    const users = [
      { id: "u1", name: "Pradeesh Ezhava", email: "pradeesh@yachtflow.co", type: "Regular User", designation: "Sales", role: "sales", active: true, password: hashPassword("sales123") },
      { id: "u2", name: "Chetan", email: "chetan@yachtflow.co", type: "Regular User", designation: "Sales", role: "sales", active: true, password: hashPassword("sales123") },
      { id: "u3", name: "SQ Accounts", email: "accounts@yachtflow.co", type: "Regular User", designation: "Accounts", role: "accounts", active: true, password: hashPassword("accounts123") },
      { id: "u4", name: "SQ ADMIN", email: "admin@yachtflow.co", type: "Admin", designation: "Admin", role: "admin", active: true, password: hashPassword("admin123") },
      { id: "u5", name: "Captain Morgan", email: "captain@yachtflow.co", type: "Regular User", designation: "Captain", role: "captain", active: true, password: hashPassword("captain123") },
      { id: "u6", name: "Agent Dubai", email: "agent.dubai@yachtflow.co", type: "Agent", designation: "Field Agent", role: "agent", active: true, password: hashPassword("agent123") },
      { id: "u7", name: "Agent Abu Dhabi", email: "agent.abudhabi@yachtflow.co", type: "Agent", designation: "Field Agent", role: "agent", active: true, password: hashPassword("agent123") }
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, type, designation, role, active, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [u.id, u.name, u.email, u.type, u.designation, u.role, u.active, u.password]
      );
    }

    // 2. Seed yachts
    console.log("Seeding default yachts list...");
    const yachts = [
      { id: "y1", name: "SQX 12 capacity", capacity: 12, hourly_rate: 300, description: "Compact luxury cruiser ideal for small private gatherings." },
      { id: "y2", name: "SQX", capacity: 8, hourly_rate: 400, description: "Elegant sports cruiser with open deck." },
      { id: "y3", name: "30 capacity", capacity: 30, hourly_rate: 600, description: "Mid-sized deck yacht with twin salons." },
      { id: "y4", name: "SQX 45 capacity", capacity: 45, hourly_rate: 850, description: "Sleek cat-hulled party yacht with lounge decks." },
      { id: "y5", name: "SQX 75 capacity", capacity: 75, hourly_rate: 1400, description: "Double-deck mega vessel fitted for corporate events." }
    ];

    for (const y of yachts) {
      await pool.query(
        `INSERT INTO yachts (id, name, capacity, hourly_rate, description) VALUES ($1, $2, $3, $4, $5)`,
        [y.id, y.name, y.capacity, y.hourly_rate, y.description]
      );
    }

    // 3. Seed system defaults
    console.log("Seeding global configurations...");
    await pool.query(
      `INSERT INTO system_defaults (key, value) VALUES ($1, $2)`,
      ['cateringPricePerGuest', '50']
    );

    // 4. Seed bookings
    console.log("Seeding mock booking histories...");
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const getLocalTodayISO = (hourStr) => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return new Date(`${yyyy}-${mm}-${dd}T${hourStr}`).toISOString();
    };
    const bookings = [
      {
        id: "b1",
        guest_name: "Tony Stark",
        adults: 6,
        children: 2,
        total_guests: 8,
        yacht_id: "y4",
        start_date: "2026-05-10T12:00:00Z",
        end_date: "2026-05-10T16:00:00Z",
        duration_hours: 4,
        pickup_location: "Marina Bay Pier 2",
        catering_enabled: true,
        external_service_charges: 250,
        subtotal: 4050,
        vat_rate: 7,
        vat_amount: 284,
        total_amount: 4334,
        payment_mode: "Bank Transfer",
        payment_amount: 4334,
        status: "Completed",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-05-01T09:30:00Z"
      },
      {
        id: "b2",
        guest_name: "Peter Parker",
        adults: 2,
        children: 0,
        total_guests: 2,
        yacht_id: "y1",
        start_date: "2026-05-15T15:00:00Z",
        end_date: "2026-05-15T18:00:00Z",
        duration_hours: 3,
        pickup_location: "Downtown Harbor Terminal",
        catering_enabled: false,
        external_service_charges: 0,
        subtotal: 900,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: 900,
        payment_mode: "Card",
        payment_amount: 900,
        status: "Completed",
        sales_person: "Chetan",
        created_at: "2026-05-12T14:15:00Z"
      },
      {
        id: "b3",
        guest_name: "Bruce Banner",
        adults: 10,
        children: 4,
        total_guests: 14,
        yacht_id: "y5",
        start_date: "2026-05-22T09:00:00Z",
        end_date: "2026-05-22T14:00:00Z",
        duration_hours: 5,
        pickup_location: "North Point Yacht Club",
        catering_enabled: true,
        external_service_charges: 500,
        subtotal: 8200,
        vat_rate: 5,
        vat_amount: 410,
        total_amount: 8610,
        payment_mode: "Bank Transfer",
        payment_amount: 8610,
        status: "Completed",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-05-18T10:00:00Z"
      },
      {
        id: "b4",
        guest_name: "Clark Kent",
        adults: 4,
        children: 1,
        total_guests: 5,
        yacht_id: "y3",
        start_date: "2026-06-05T14:00:00Z",
        end_date: "2026-06-05T18:00:00Z",
        duration_hours: 4,
        pickup_location: "Downtown Harbor Terminal",
        catering_enabled: true,
        external_service_charges: 150,
        subtotal: 2800,
        vat_rate: 7,
        vat_amount: 196,
        total_amount: 2996,
        payment_mode: "Online",
        payment_amount: 2996,
        status: "Completed",
        sales_person: "Chetan",
        created_at: "2026-06-01T11:00:00Z"
      },
      {
        id: "b5",
        guest_name: "Selina Kyle",
        adults: 3,
        children: 0,
        total_guests: 3,
        yacht_id: "y1",
        start_date: "2026-06-12T18:00:00Z",
        end_date: "2026-06-12T21:00:00Z",
        duration_hours: 3,
        pickup_location: "Marina Bay Pier 2",
        catering_enabled: false,
        external_service_charges: 300,
        subtotal: 1200,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: 1200,
        payment_mode: "Cash",
        payment_amount: 1200,
        status: "Completed",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-06-10T16:45:00Z"
      },
      {
        id: "b6",
        guest_name: "Arthur Curry",
        adults: 20,
        children: 5,
        total_guests: 25,
        yacht_id: "y5",
        start_date: "2026-06-18T11:00:00Z",
        end_date: "2026-06-18T17:00:00Z",
        duration_hours: 6,
        pickup_location: "Marina Bay Pier 2",
        catering_enabled: true,
        external_service_charges: 800,
        subtotal: 10450,
        vat_rate: 5,
        vat_amount: 523,
        total_amount: 10973,
        payment_mode: "Bank Transfer",
        payment_amount: 10973,
        status: "Completed",
        sales_person: "Chetan",
        created_at: "2026-06-12T13:20:00Z"
      },
      {
        id: "b7",
        guest_name: "Barry Allen",
        adults: 5,
        children: 2,
        total_guests: 7,
        yacht_id: "y3",
        start_date: "2026-06-25T13:00:00Z",
        end_date: "2026-06-25T16:00:00Z",
        duration_hours: 3,
        pickup_location: "North Point Yacht Club",
        catering_enabled: true,
        external_service_charges: 100,
        subtotal: 2250,
        vat_rate: 7,
        vat_amount: 158,
        total_amount: 2408,
        payment_mode: "Online",
        payment_amount: 2408,
        status: "Confirmed",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-06-20T10:00:00Z"
      },
      {
        id: "b8",
        guest_name: "Hal Jordan",
        adults: 12,
        children: 0,
        total_guests: 12,
        yacht_id: "y4",
        start_date: "2026-06-28T16:00:00Z",
        end_date: "2026-06-28T21:00:00Z",
        duration_hours: 5,
        pickup_location: "Marina Bay Pier 2",
        catering_enabled: true,
        external_service_charges: 200,
        subtotal: 5050,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: 5050,
        payment_mode: "Bank Transfer",
        payment_amount: 2000,
        status: "Confirmed",
        sales_person: "Chetan",
        created_at: "2026-06-22T15:30:00Z"
      },
      {
        id: "b9",
        guest_name: "Wanda Maximoff",
        adults: 4,
        children: 0,
        total_guests: 4,
        yacht_id: "y1",
        start_date: getLocalTodayISO("10:00:00"),
        end_date: getLocalTodayISO("14:00:00"),
        duration_hours: 4,
        pickup_location: "Downtown Harbor Terminal",
        catering_enabled: true,
        external_service_charges: 150,
        subtotal: 1550,
        vat_rate: 5,
        vat_amount: 78,
        total_amount: 1628,
        payment_mode: "Card",
        payment_amount: 1628,
        status: "Confirmed",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-06-29T11:00:00Z",
        actual_adults: null,
        actual_children: 0,
        actual_total_guests: null,
        payment_collected_by: null,
        boarding_status: "Scheduled"
      },
      {
        id: "b10",
        guest_name: "Stephen Strange",
        adults: 8,
        children: 2,
        total_guests: 10,
        yacht_id: "y5",
        start_date: "2026-07-12T14:00:00Z",
        end_date: "2026-07-12T20:00:00Z",
        duration_hours: 6,
        pickup_location: "North Point Yacht Club",
        catering_enabled: true,
        external_service_charges: 400,
        subtotal: 9300,
        vat_rate: 7,
        vat_amount: 651,
        total_amount: 9951,
        payment_mode: "Bank Transfer",
        payment_amount: 0,
        status: "Pending",
        sales_person: "Pradeesh Ezhava",
        created_at: "2026-06-28T09:15:00Z",
        actual_adults: null,
        actual_children: 0,
        actual_total_guests: null,
        payment_collected_by: null,
        boarding_status: "Scheduled"
      },
      {
        id: "b11",
        guest_name: "Bruce Wayne",
        adults: 10,
        children: 2,
        total_guests: 12,
        yacht_id: "y4",
        start_date: getLocalTodayISO("15:00:00"),
        end_date: getLocalTodayISO("19:00:00"),
        duration_hours: 4,
        pickup_location: "North Point Yacht Club",
        catering_enabled: true,
        external_service_charges: 300,
        subtotal: 4300,
        vat_rate: 5,
        vat_amount: 215,
        total_amount: 4515,
        payment_mode: "Cash",
        payment_amount: 0,
        status: "Confirmed",
        sales_person: "Chetan",
        created_at: "2026-06-30T10:00:00Z",
        actual_adults: null,
        actual_children: 0,
        actual_total_guests: null,
        payment_collected_by: null,
        boarding_status: "Scheduled"
      }
    ];

    for (const b of bookings) {
      const isCatering = !!b.catering_enabled;
      const cateringVal = isCatering ? (b.adults + b.children) * 50 : 0;

      await pool.query(
        `INSERT INTO bookings (
          id, guest_name, adults, children, total_guests, yacht_id, 
          start_date, end_date, duration_hours, offered_hourly_rate,
          catering_enabled, external_service_charges, subtotal, 
          vat_rate, vat_amount, total_amount, payment_mode, 
          payment_amount, status, sales_person, created_at,
          actual_adults, actual_children, actual_total_guests, payment_collected_by, boarding_status,
          decoration_charges, water_slide_charges, jet_ski_charges, catering_charges, other_charges
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
        [
          b.id, b.guest_name, b.adults, b.children, b.total_guests, b.yacht_id,
          b.start_date, b.end_date, b.duration_hours, null,
          b.catering_enabled, b.external_service_charges, b.subtotal,
          b.vat_rate, b.vat_amount, b.total_amount, b.payment_mode,
          b.payment_amount, b.status, b.sales_person, b.created_at,
          b.actual_adults || null, b.actual_children || 0, b.actual_total_guests || null, b.payment_collected_by || null, b.boarding_status || 'Scheduled',
          0, 0, 0, cateringVal, 0
        ]
      );
    }

    console.log("Database seeded successfully with all default users, SQX yachts, and historical bookings.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await pool.end();
  }
}

runSeed();
