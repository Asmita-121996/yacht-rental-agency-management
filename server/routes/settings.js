import express from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const defaults = await db.system_defaults.findMany();
    const settings = {
      cateringPricePerGuest: 50,
      whatsappProvider: 'none',
      whatsappApiUrl: '',
      whatsappToken: '',
      whatsappPhoneId: ''
    };
    
    defaults.forEach(item => {
      if (item.key === 'cateringPricePerGuest') {
        settings.cateringPricePerGuest = Number(item.value);
      } else if (['whatsappProvider', 'whatsappApiUrl', 'whatsappToken', 'whatsappPhoneId'].includes(item.key)) {
        settings[item.key] = item.value;
      }
    });

    res.json(settings);
  } catch (err) {
    console.error("Fetch settings error:", err);
    res.status(500).json({ error: "Could not retrieve global settings." });
  }
});

// PUT /api/settings
router.put('/', requireAdmin, async (req, res) => {
  const { cateringPricePerGuest, whatsappProvider, whatsappApiUrl, whatsappToken, whatsappPhoneId } = req.body;

  try {
    const upserts = [];
    if (cateringPricePerGuest !== undefined) {
      upserts.push(db.system_defaults.upsert({
        where: { key: 'cateringPricePerGuest' },
        update: { value: String(cateringPricePerGuest) },
        create: { key: 'cateringPricePerGuest', value: String(cateringPricePerGuest) }
      }));
    }
    if (whatsappProvider !== undefined) {
      upserts.push(db.system_defaults.upsert({
        where: { key: 'whatsappProvider' },
        update: { value: String(whatsappProvider) },
        create: { key: 'whatsappProvider', value: String(whatsappProvider) }
      }));
    }
    if (whatsappApiUrl !== undefined) {
      upserts.push(db.system_defaults.upsert({
        where: { key: 'whatsappApiUrl' },
        update: { value: String(whatsappApiUrl) },
        create: { key: 'whatsappApiUrl', value: String(whatsappApiUrl) }
      }));
    }
    if (whatsappToken !== undefined) {
      upserts.push(db.system_defaults.upsert({
        where: { key: 'whatsappToken' },
        update: { value: String(whatsappToken) },
        create: { key: 'whatsappToken', value: String(whatsappToken) }
      }));
    }
    if (whatsappPhoneId !== undefined) {
      upserts.push(db.system_defaults.upsert({
        where: { key: 'whatsappPhoneId' },
        update: { value: String(whatsappPhoneId) },
        create: { key: 'whatsappPhoneId', value: String(whatsappPhoneId) }
      }));
    }

    await Promise.all(upserts);

    res.json({
      cateringPricePerGuest: cateringPricePerGuest !== undefined ? Number(cateringPricePerGuest) : undefined,
      whatsappProvider,
      whatsappApiUrl,
      whatsappToken,
      whatsappPhoneId
    });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Could not save global defaults settings." });
  }
});

export default router;
