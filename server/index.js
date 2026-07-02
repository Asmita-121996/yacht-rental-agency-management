import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to hash passwords with SHA-256
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// ---------------- USER AUTHENTICATION ----------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const result = await db.query(
      `SELECT id, name, type, designation, role, active, password FROM users WHERE LOWER(name) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Incorrect name or password." });
    }

    const user = result.rows[0];
    if (!user.active) {
      return res.status(403).json({ error: "This account is currently suspended. Contact administration." });
    }

    const hashedInput = hashPassword(password);
    if (user.password !== hashedInput) {
      return res.status(401).json({ error: "Incorrect name or password." });
    }

    // Exclude password in response
    const { password: _, ...userPayload } = user;
    res.json({ user: userPayload });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({ error: "Internal server authentication error." });
  }
});


// ---------------- USER ACCOUNTS CRUD ----------------
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, designation, role, active, password FROM users ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Could not fetch user accounts." });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, type, designation, role, password } = req.body;
  if (!name || !type || !designation || !role || !password) {
    return res.status(400).json({ error: "All account fields are required." });
  }

  try {
    const checkUser = await db.query(`SELECT 1 FROM users WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "A user account with this name already exists." });
    }

    const newId = "u_" + Math.random().toString(36).substr(2, 9);
    const hashedPwd = hashPassword(password);

    await db.query(
      `INSERT INTO users (id, name, type, designation, role, active, password) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, name.trim(), type, designation, role, true, hashedPwd]
    );

    res.status(201).json({ id: newId, name, type, designation, role, active: true, password });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Could not create user account." });
  }
});

app.put('/api/users/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await db.query(`SELECT active FROM users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    const newStatus = !userResult.rows[0].active;
    await db.query(`UPDATE users SET active = $1 WHERE id = $2`, [newStatus, id]);
    res.json({ id, active: newStatus });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ error: "Could not toggle user active status." });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password field cannot be empty." });
  }

  try {
    const hashed = hashPassword(password);
    await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, id]);
    res.json({ id, success: true });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Could not update account password." });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ id, success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Could not delete user account." });
  }
});


// ---------------- YACHT REGISTRY CRUD ----------------
app.get('/api/yachts', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, name, capacity, hourly_rate AS "hourlyRate", description FROM yachts ORDER BY hourly_rate ASC`);
    // Ensure hourlyRate is returned as numeric type
    const yachts = result.rows.map(y => ({ ...y, hourlyRate: Number(y.hourlyRate) }));
    res.json(yachts);
  } catch (err) {
    console.error("Fetch yachts error:", err);
    res.status(500).json({ error: "Could not fetch yacht registry." });
  }
});

app.post('/api/yachts', async (req, res) => {
  const { name, capacity, hourlyRate, description } = req.body;
  if (!name || !capacity || !hourlyRate) {
    return res.status(400).json({ error: "Name, capacity limit, and hourly base rate are required." });
  }

  try {
    const checkYacht = await db.query(`SELECT 1 FROM yachts WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (checkYacht.rows.length > 0) {
      return res.status(400).json({ error: "A yacht profile with this name already exists." });
    }

    const newId = "y_" + Math.random().toString(36).substr(2, 9);
    await db.query(
      `INSERT INTO yachts (id, name, capacity, hourly_rate, description) VALUES ($1, $2, $3, $4, $5)`,
      [newId, name.trim(), Number(capacity), Number(hourlyRate), description]
    );

    res.status(201).json({ id: newId, name, capacity, hourlyRate, description });
  } catch (err) {
    console.error("Create yacht error:", err);
    res.status(500).json({ error: "Could not register new yacht." });
  }
});

app.put('/api/yachts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, capacity, hourlyRate, description } = req.body;

  try {
    await db.query(
      `UPDATE yachts SET name = $1, capacity = $2, hourly_rate = $3, description = $4 WHERE id = $5`,
      [name.trim(), Number(capacity), Number(hourlyRate), description, id]
    );
    res.json({ id, name, capacity, hourlyRate, description });
  } catch (err) {
    console.error("Update yacht error:", err);
    res.status(500).json({ error: "Could not update yacht profile." });
  }
});

app.delete('/api/yachts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM yachts WHERE id = $1`, [id]);
    res.json({ id, success: true });
  } catch (err) {
    console.error("Delete yacht error:", err);
    res.status(500).json({ error: "Could not delete yacht profile." });
  }
});


// ---------------- BOOKINGS CRUD & CONFLICT CHECKING ----------------
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, guest_name AS "guestName", adults, children, total_guests AS "totalGuests", 
              yacht_id AS "yachtId", start_date AS "startDate", end_date AS "endDate", 
              duration_hours AS "durationHours", pickup_location AS "pickupLocation", 
              catering_enabled AS "cateringEnabled", external_service_charges AS "externalServiceCharges", 
              subtotal, vat_rate AS "vatRate", vat_amount AS "vatAmount", total_amount AS "totalAmount", 
              payment_mode AS "paymentMode", payment_amount AS "paymentAmount", status, 
              sales_person AS "salesPerson", created_at AS "createdAt"
       FROM bookings 
       ORDER BY start_date ASC`
    );

    // Map query to match client fields types (e.g. numeric mapping)
    const bookings = result.rows.map(b => ({
      ...b,
      adults: Number(b.adults),
      children: Number(b.children),
      totalGuests: Number(b.totalGuests),
      durationHours: Number(b.durationHours),
      cateringEnabled: Boolean(b.cateringEnabled),
      externalServiceCharges: Number(b.externalServiceCharges),
      subtotal: Number(b.subtotal),
      vatRate: Number(b.vatRate),
      vatAmount: Number(b.vatAmount),
      totalAmount: Number(b.totalAmount),
      paymentAmount: Number(b.paymentAmount),
      startDate: new Date(b.startDate).toISOString().slice(0, 16),
      endDate: new Date(b.endDate).toISOString().slice(0, 16),
    }));

    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err);
    res.status(500).json({ error: "Could not fetch bookings log." });
  }
});

app.post('/api/bookings', async (req, res) => {
  const {
    guestName, adults, children, totalGuests, yachtId, startDate, endDate, durationHours,
    pickupLocation, cateringEnabled, externalServiceCharges, subtotal, vatRate, vatAmount,
    totalAmount, paymentMode, paymentAmount, status, salesPerson
  } = req.body;

  try {
    // BACKEND OVERLAP RESOLUTION
    const conflictQuery = await db.query(
      `SELECT id, guest_name AS "guestName" 
       FROM bookings 
       WHERE yacht_id = $1 
         AND status != 'Cancelled' 
         AND start_date < $3 
         AND end_date > $2`,
      [yachtId, new Date(startDate), new Date(endDate)]
    );

    if (conflictQuery.rows.length > 0) {
      const conflict = conflictQuery.rows[0];
      return res.status(409).json({
        error: `Schedule Conflict: This yacht is already booked by ${conflict.guestName} during this time interval.`
      });
    }

    const newId = "b_" + Math.random().toString(36).substr(2, 9);
    await db.query(
      `INSERT INTO bookings (
        id, guest_name, adults, children, total_guests, yacht_id, 
        start_date, end_date, duration_hours, pickup_location, 
        catering_enabled, external_service_charges, subtotal, 
        vat_rate, vat_amount, total_amount, payment_mode, 
        payment_amount, status, sales_person, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP)`,
      [
        newId, guestName, Number(adults), Number(children), Number(totalGuests), yachtId,
        new Date(startDate), new Date(endDate), Number(durationHours), pickupLocation,
        Boolean(cateringEnabled), Number(externalServiceCharges), Number(subtotal),
        Number(vatRate), Number(vatAmount), Number(totalAmount), paymentMode,
        Number(paymentAmount), status, salesPerson
      ]
    );

    res.status(201).json({ id: newId, guestName, totalGuests, status });
  } catch (err) {
    console.error("Create booking conflict check error:", err);
    res.status(500).json({ error: "Could not save charter booking." });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    guestName, adults, children, totalGuests, yachtId, startDate, endDate, durationHours,
    pickupLocation, cateringEnabled, externalServiceCharges, subtotal, vatRate, vatAmount,
    totalAmount, paymentMode, paymentAmount, status, salesPerson
  } = req.body;

  try {
    // BACKEND OVERLAP RESOLUTION (Excluding own booking ID)
    if (status !== 'Cancelled') {
      const conflictQuery = await db.query(
        `SELECT id, guest_name AS "guestName" 
         FROM bookings 
         WHERE yacht_id = $1 
           AND id != $4 
           AND status != 'Cancelled' 
           AND start_date < $3 
           AND end_date > $2`,
        [yachtId, new Date(startDate), new Date(endDate), id]
      );

      if (conflictQuery.rows.length > 0) {
        const conflict = conflictQuery.rows[0];
        return res.status(409).json({
          error: `Schedule Conflict: This yacht is already booked by ${conflict.guestName} during this time interval.`
        });
      }
    }

    await db.query(
      `UPDATE bookings SET 
        guest_name = $1, adults = $2, children = $3, total_guests = $4, yacht_id = $5, 
        start_date = $6, end_date = $7, duration_hours = $8, pickup_location = $9, 
        catering_enabled = $10, external_service_charges = $11, subtotal = $12, 
        vat_rate = $13, vat_amount = $14, total_amount = $15, payment_mode = $16, 
        payment_amount = $17, status = $18, sales_person = $19 
      WHERE id = $20`,
      [
        guestName, Number(adults), Number(children), Number(totalGuests), yachtId,
        new Date(startDate), new Date(endDate), Number(durationHours), pickupLocation,
        Boolean(cateringEnabled), Number(externalServiceCharges), Number(subtotal),
        Number(vatRate), Number(vatAmount), Number(totalAmount), paymentMode,
        Number(paymentAmount), status, salesPerson, id
      ]
    );

    res.json({ id, guestName, totalGuests, status });
  } catch (err) {
    console.error("Update booking conflict check error:", err);
    res.status(500).json({ error: "Could not update booking registry." });
  }
});


// ---------------- GLOBAL CONFIG ENDPOINTS ----------------
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.query(`SELECT value FROM system_defaults WHERE key = 'cateringPricePerGuest'`);
    if (result.rows.length === 0) {
      return res.json({ cateringPricePerGuest: 50 });
    }
    res.json({ cateringPricePerGuest: Number(result.rows[0].value) });
  } catch (err) {
    console.error("Fetch settings error:", err);
    res.status(500).json({ error: "Could not retrieve global settings." });
  }
});

app.put('/api/settings', async (req, res) => {
  const { cateringPricePerGuest } = req.body;
  if (cateringPricePerGuest === undefined) {
    return res.status(400).json({ error: "Catering service fee is required." });
  }

  try {
    await db.query(
      `INSERT INTO system_defaults (key, value) VALUES ('cateringPricePerGuest', $1) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(cateringPricePerGuest)]
    );
    res.json({ cateringPricePerGuest: Number(cateringPricePerGuest) });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Could not save global defaults settings." });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`YachtFlow Express Server running on http://localhost:${PORT}`);
});
