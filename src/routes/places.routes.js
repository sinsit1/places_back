import { Router } from 'express';
import Place from '../models/Place.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// 📌 Listado público de lugares aprobados
router.get('/places', async (req, res) => {
  try {
    const { search = '', minRating = 0, page = 1, limit = 10 } = req.query;
    const q = { status: 'approved' };

    if (search) q.$text = { $search: String(search) };
    if (minRating) q.avgRating = { $gte: Number(minRating) };

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      Place.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Place.countDocuments(q)
    ]);

    res.json({
      data,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total
    });
  } catch (err) {
    console.error("❌ Error GET /places:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Obtener un lugar por id
router.get('/places/:id', requireAuth, async (req, res) => {
  try {
    const p = await Place.findById(req.params.id)
      .populate({
        path: 'reviews',
        populate: { path: 'author', select: 'name email' }
      })
      .lean();

    if (!p) return res.status(404).json({ error: 'No encontrado' });

    if (
      p.status !== 'approved' &&
      !(String(p.author) === req.user.id || req.user.role === 'admin')
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    res.json({ place: p });
  } catch (err) {
    console.error("❌ Error GET /places/:id:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Crear propuesta de lugar (queda en pending)
router.post('/places', requireAuth, async (req, res) => {
  try {
    const place = await Place.create({
      ...req.body,
      author: req.user.id,
      status: 'pending'
    });
    res.status(201).json({ place });
  } catch (err) {
    console.error("❌ Error POST /places:", err.message);
    res.status(400).json({ error: 'No se pudo crear el lugar' });
  }
});

// 📌 Admin: listado de propuestas pendientes
router.get('/admin/places/pending', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const data = await Place.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ data });
  } catch (err) {
    console.error("❌ Error GET /admin/places/pending:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Admin: aprobar o rechazar un lugar
router.patch('/places/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const allowed = ['approved', 'rejected'];
    const { status } = req.body;
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Estado inválido' });

    const place = await Place.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!place) return res.status(404).json({ error: 'No encontrado' });

    res.json({ place });
  } catch (err) {
    console.error("❌ Error PATCH /places/:id/status:", err.message);
    res.status(500).json({ error: 'No se pudo actualizar el estado' });
  }
});

// 📌 Admin: editar información de un lugar
router.patch('/places/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location } = req.body;

    const update = {};
    if (title) update.title = title;
    if (description) update.description = description;
    if (location) update.location = location;

    const place = await Place.findByIdAndUpdate(id, update, { new: true });
    if (!place) return res.status(404).json({ error: 'No encontrado' });

    res.json({ place });
  } catch (err) {
    console.error("❌ Error PATCH /places/:id:", err.message);
    res.status(500).json({ error: 'No se pudo actualizar el lugar' });
  }
});

// 📌 Admin: eliminar un lugar
router.delete('/places/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
  } catch (err) {
    console.error("❌ Error DELETE /places/:id:", err.message);
    res.status(500).json({ error: 'No se pudo eliminar el lugar' });
  }
});

export default router;
