import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Place from '../models/Place.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// 📂 Configuración de Multer para subir imágenes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads/places'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1.5 * 1024 * 1024 }, // 🔹 Máx 1.5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ Solo se permiten imágenes (jpg, jpeg, png, webp)'));
    }
  }
});

// 📌 Listado público de lugares aprobados (con paginación y filtros)
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

// 📌 Nuevo: listado optimizado para pintar el mapa
router.get('/places/map', async (req, res) => {
  try {
    const q = { status: 'approved' };
    const data = await Place.find(q, 'title description location').lean();
    res.json({ data });
  } catch (err) {
    console.error("❌ Error GET /places/map:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Obtener un lugar por id
router.get('/places/:id', async (req, res) => {
  try {
    const p = await Place.findById(req.params.id)
      .populate({
        path: 'reviews',
        populate: { path: 'author', select: 'name email' }
      })
      .lean();

    if (!p) return res.status(404).json({ error: 'No encontrado' });

    if (p.status === 'approved') {
      return res.json({ place: p });
    }

    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = auth.split(' ')[1];
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (String(p.author) !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    res.json({ place: p });
  } catch (err) {
    console.error("❌ Error GET /places/:id:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Crear propuesta de lugar (ahora con fotos y parseo de FormData)
router.post('/places', requireAuth, upload.array('photos', 2), async (req, res) => {
  try {
    console.log("📂 req.body:", req.body);
    console.log("📸 req.files:", req.files);

    const title = req.body.title ?? '';
    const description = req.body.description ?? '';

    // 📍 Parsear location si viene como JSON
    let location = { type: 'Point', coordinates: [] };
    if (req.body.location) {
      try {
        const parsed = JSON.parse(req.body.location);
        if (
          parsed.type === 'Point' &&
          Array.isArray(parsed.coordinates) &&
          parsed.coordinates.length === 2
        ) {
          location = parsed;
        }
      } catch (err) {
        console.error("❌ Error parseando location:", err.message);
      }
    }

    const photoPaths = (req.files || []).map(f => `/uploads/places/${f.filename}`);

    const place = await Place.create({
      title,
      description,
      location,
      author: req.user.id,
      status: 'pending',
      photos: photoPaths
    });

    res.status(201).json({ place });
  } catch (e) {
    console.error("❌ Error POST /places:", e.message);
    res.status(400).json({ error: 'No se pudo crear el lugar' });
  }
});

// 📌 Admin: listado de propuestas pendientes (populate autor y fotos)
router.get('/admin/places/pending', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const data = await Place.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('author', 'name email')
      .select('title description photos author status createdAt')
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
