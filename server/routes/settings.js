import express from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const setting = await db.system_defaults.findUnique({
      where: { key: 'cateringPricePerGuest' }
    });

    if (!setting) {
      return res.json({ cateringPricePerGuest: 50 });
    }
    res.json({ cateringPricePerGuest: Number(setting.value) });
  } catch (err) {
    console.error("Fetch settings error:", err);
    res.status(500).json({ error: "Could not retrieve global settings." });
  }
});

// PUT /api/settings
router.put('/', requireAdmin, async (req, res) => {
  const { cateringPricePerGuest } = req.body;
  if (cateringPricePerGuest === undefined) {
    return res.status(400).json({ error: "Catering service fee is required." });
  }

  try {
    await db.system_defaults.upsert({
      where: { key: 'cateringPricePerGuest' },
      update: { value: String(cateringPricePerGuest) },
      create: { key: 'cateringPricePerGuest', value: String(cateringPricePerGuest) }
    });

    res.json({ cateringPricePerGuest: Number(cateringPricePerGuest) });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Could not save global defaults settings." });
  }
});

export default router;
