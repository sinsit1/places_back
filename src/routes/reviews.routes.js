import { Router } from 'express';
import Review from '../models/Review.js';
import Place from '../models/Place.js';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function recomputePlaceStats(placeId) {
  const agg = await Review.aggregate([
    { $match: { place: new mongoose.Types.ObjectId(placeId) } },
    { $group: { _id: '$place', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Place.findByIdAndUpdate(placeId, { avgRating: avg, reviewsCount: count });
}

// 📌 Crear review (acepta ambas rutas)
router.post(['/places/:id/reviews', '/reviews'], requireAuth, async (req, res) => {
  try {
    const { rating, comment, place } = req.body;
    const placeId = req.params.id || place; // 🔹 Soporta /places/:id/reviews y /reviews

    if (!placeId || !rating) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const r = await Review.create({
      place: placeId,
      author: req.user.id,
      rating,
      comment
    });

    await recomputePlaceStats(placeId);

    const p = await Place.findById(placeId).lean();
    res.status(201).json({
      review: r,
      place: { avgRating: p.avgRating, reviewsCount: p.reviewsCount }
    });

  } catch (err) {
    if (err.code === 11000) {
      // 🔹 Error de índice único -> ya existe review de este usuario en este lugar
      return res.status(409).json({ error: 'Ya has opinado sobre este lugar' });
    }

    console.error("❌ Error al crear review:", err);
    res.status(500).json({ error: "Error interno al crear review" });
  }
});


// 📌 Editar review propia
router.patch('/reviews/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await Review.findOneAndUpdate(
      { _id: req.params.id, author: req.user.id },
      req.body,
      { new: true }
    );
    if (!r) return res.status(404).json({ error: 'No encontrado' });

    await recomputePlaceStats(r.place);
    const p = await Place.findById(r.place).lean();
    res.json({ review: r, place: { avgRating: p.avgRating, reviewsCount: p.reviewsCount } });
  } catch (err) {
    next(err);
  }
});

// 📌 Eliminar review (propia o admin)
router.delete('/reviews/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'No encontrado' });

    if (String(r.author) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await Review.findByIdAndDelete(req.params.id);
    await recomputePlaceStats(r.place);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
