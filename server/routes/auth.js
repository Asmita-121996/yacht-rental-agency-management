import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { hashPassword, getCookieValue } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await db.users.findFirst({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Incorrect name or password." });
    }

    if (!user.active) {
      return res.status(403).json({ error: "This account is currently suspended. Contact administration." });
    }

    const hashedInput = hashPassword(password);
    if (user.password !== hashedInput) {
      return res.status(401).json({ error: "Incorrect name or password." });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Valid for 24 hours

    await db.sessions.create({
      data: {
        id: token,
        user_id: user.id,
        expires_at: expiresAt
      }
    });

    // Set HTTP-only secure cookie
    res.cookie('yachtflow_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Exclude password in response
    const { password: _, ...userPayload } = user;
    res.json({ user: userPayload });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({ error: "Internal server authentication error." });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = getCookieValue(req.headers.cookie, 'yachtflow_session') || req.headers['x-session-token'];
  if (token) {
    await db.sessions.delete({ where: { id: token } }).catch(() => {});
  }
  res.clearCookie('yachtflow_session');
  res.json({ success: true });
});

// GET /api/auth/session
router.get('/session', (req, res) => {
  res.json({ user: req.user });
});

export default router;
