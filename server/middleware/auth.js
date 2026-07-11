import crypto from 'crypto';
import db from '../db.js';

// Helper to hash passwords with SHA-256
export function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// Helper to parse cookie value manually
export function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
  const match = cookies.find(([k]) => k === name);
  return match ? decodeURIComponent(match[1]) : null;
}

// Authentication Middleware
export const authMiddleware = async (req, res, next) => {
  const token = getCookieValue(req.headers.cookie, 'yachtflow_session') || req.headers['x-session-token'];
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const session = await db.sessions.findUnique({
      where: { id: token },
      include: { users: true }
    });

    if (!session || new Date(session.expires_at) < new Date()) {
      if (session) {
        await db.sessions.delete({ where: { id: token } }).catch(() => {});
      }
      res.clearCookie('yachtflow_session');
      req.user = null;
      return next();
    }

    const { password: _, ...userPayload } = session.users;
    req.user = userPayload;
    req.sessionId = token;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    req.user = null;
    next();
  }
};

// Authorization Gate Middlewares
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Incorrect name or password." }); // generic security-aligned error
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Incorrect name or password." });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  next();
};
