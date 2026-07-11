import express from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, hashPassword } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users
router.get('/', requireAuth, async (req, res) => {
  try {
    const usersList = await db.users.findMany({
      orderBy: { name: 'asc' }
    });

    if (req.user.role === 'admin') {
      res.json(usersList);
    } else {
      // Omit password fields for non-admin requests
      const sanitized = usersList.map(({ password, ...rest }) => rest);
      res.json(sanitized);
    }
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Could not fetch user accounts." });
  }
});

// POST /api/users
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, type, designation, role, password } = req.body;
  if (!name || !email || !type || !designation || !role || !password) {
    return res.status(400).json({ error: "All account fields are required." });
  }

  try {
    const checkUser = await db.users.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { email: { equals: email.trim(), mode: 'insensitive' } }
        ]
      }
    });

    if (checkUser) {
      return res.status(400).json({ error: "A user account with this name or email already exists." });
    }

    const newId = "u_" + Math.random().toString(36).substr(2, 9);
    const hashedPwd = hashPassword(password);

    await db.users.create({
      data: {
        id: newId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        type,
        designation,
        role,
        active: true,
        password: hashedPwd
      }
    });

    res.status(201).json({ id: newId, name, email, type, designation, role, active: true, password });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Could not create user account." });
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.users.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const newStatus = !user.active;
    await db.users.update({
      where: { id },
      data: { active: newStatus }
    });

    res.json({ id, active: newStatus });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ error: "Could not toggle user active status." });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password field cannot be empty." });
  }

  try {
    const hashed = hashPassword(password);
    await db.users.update({
      where: { id },
      data: { password: hashed }
    });
    res.json({ id, success: true });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Could not update account password." });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.users.delete({
      where: { id }
    });
    res.json({ id, success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Could not delete user account." });
  }
});

export default router;
