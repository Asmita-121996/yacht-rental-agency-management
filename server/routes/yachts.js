import express from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/yachts
router.get('/', requireAuth, async (req, res) => {
  try {
    const yachtsList = await db.yachts.findMany({
      orderBy: { hourly_rate: 'asc' }
    });
    const yachts = yachtsList.map(y => ({
      id: y.id,
      name: y.name,
      capacity: y.capacity,
      hourlyRate: Number(y.hourly_rate),
      description: y.description
    }));
    res.json(yachts);
  } catch (err) {
    console.error("Fetch yachts error:", err);
    res.status(500).json({ error: "Could not fetch yacht registry." });
  }
});

// POST /api/yachts
router.post('/', requireAdmin, async (req, res) => {
  const { name, capacity, hourlyRate, description } = req.body;
  if (!name || !capacity || !hourlyRate) {
    return res.status(400).json({ error: "Name, capacity limit, and hourly base rate are required." });
  }

  try {
    const checkYacht = await db.yachts.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (checkYacht) {
      return res.status(400).json({ error: "A yacht profile with this name already exists." });
    }

    const newId = "y_" + Math.random().toString(36).substr(2, 9);
    await db.yachts.create({
      data: {
        id: newId,
        name: name.trim(),
        capacity: Number(capacity),
        hourly_rate: Number(hourlyRate),
        description
      }
    });

    res.status(201).json({ id: newId, name, capacity, hourlyRate, description });
  } catch (err) {
    console.error("Create yacht error:", err);
    res.status(500).json({ error: "Could not register new yacht." });
  }
});

// PUT /api/yachts/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, capacity, hourlyRate, description } = req.body;

  try {
    await db.yachts.update({
      where: { id },
      data: {
        name: name.trim(),
        capacity: Number(capacity),
        hourly_rate: Number(hourlyRate),
        description
      }
    });
    res.json({ id, name, capacity, hourlyRate, description });
  } catch (err) {
    console.error("Update yacht error:", err);
    res.status(500).json({ error: "Could not update yacht profile." });
  }
});

// DELETE /api/yachts/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.yachts.delete({
      where: { id }
    });
    res.json({ id, success: true });
  } catch (err) {
    console.error("Delete yacht error:", err);
    res.status(500).json({ error: "Could not delete yacht profile." });
  }
});

export default router;
