import { Router } from "express";
import jwt from "jsonwebtoken";
import Place from "../models/Place.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/* ============================================================
   GET /places
   Lista de lugares aprobados (buscador + filtros + paginación)
   Nota: Esto es público porque los lugares aprobados son visibles
============================================================ */
router.get("/places", async (req, res) => {
  try {
    const { search = "", minRating = 0, page = 1, limit = 10 } = req.query;

    // Filtro básico: solo quiero lugares aprobados
    const q = { status: "approved" };

    // Si hay texto de búsqueda, uso el índice de texto
    if (search) q.$text = { $search: String(search) };

    // Si se pide nota mínima, filtro también por ahí
    if (minRating) q.avgRating = { $gte: Number(minRating) };

    const skip = (Number(page) - 1) * Number(limit);

    // Hago dos consultas en paralelo: datos + total
    const [data, total] = await Promise.all([
      Place.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Place.countDocuments(q),
    ]);

    res.json({
      data,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (err) {
    console.error("Error GET /places:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   GET /places/map
   Versión reducida para pintar el mapa sin sobrecargar datos
============================================================ */
router.get("/places/map", async (req, res) => {
  try {
    const data = await Place.find(
      { status: "approved" },
      "title description location"
    ).lean();

    res.json({ data });
  } catch (err) {
    console.error("Error GET /places/map:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   GET /places/:id
   Devuelve el detalle del lugar
   Si está aprobado → es público
   Si NO está aprobado → solo autor o admin
============================================================ */
router.get("/places/:id", async (req, res) => {
  try {
    const p = await Place.findById(req.params.id)
      .populate({
        path: "reviews",
        populate: { path: "author", select: "name email" },
      })
      .lean();

    if (!p) return res.status(404).json({ error: "No encontrado" });

    // Si el lugar está aprobado, lo muestro sin restricciones
    if (p.status === "approved") {
      return res.json({ place: p });
    }

    // A partir de aquí, el lugar NO está aprobado → compruebo el token
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No autenticado" });

    const token = auth.split(" ")[1];
    let user;

    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }

    // El usuario debe ser autor del lugar o admin
    if (String(p.author) !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    res.json({ place: p });
  } catch (err) {
    console.error("Error GET /places/:id:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   POST /places
   Crear nueva propuesta de lugar
   Nota: Ahora que no hay fotos, funciona SOLO con JSON.
   El frontend envía: { title, description, location }
============================================================ */
router.post("/places", requireAuth, async (req, res) => {
  try {
    const { title, description, location } = req.body;

    // El título y descripción deben existir
    if (!title || !description) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Inicializo la location vacía por si llega mal
    let finalLocation = { type: "Point", coordinates: [] };

    // Compruebo que el frontend haya mandado un objeto location válido
    if (location && location.coordinates) {
      const coords = location.coordinates;

      // Confirmo que coords sea un array de 2 números
      if (
        Array.isArray(coords) &&
        coords.length === 2 &&
        !isNaN(coords[0]) &&
        !isNaN(coords[1])
      ) {
        finalLocation = {
          type: "Point",
          coordinates: coords,
        };
      }
    }

    // Creo el documento
    const place = await Place.create({
      title,
      description,
      location: finalLocation,
      author: req.user.id,
      status: "pending", // Siempre pendiente hasta que admin apruebe
      photos: [], // Lo dejo vacío porque ya no usamos imágenes
    });

    res.status(201).json({ place });
  } catch (e) {
    console.error("Error POST /places:", e.message);
    res.status(400).json({ error: "No se pudo crear el lugar" });
  }
});

/* ============================================================
   GET /admin/places/pending
   Listado de lugares pendientes (solo admins)
============================================================ */
router.get(
  "/admin/places/pending",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const data = await Place.find({ status: "pending" })
        .sort({ createdAt: 1 })
        .populate("author", "name email")
        .select("title description photos author status createdAt")
        .lean();

      res.json({ data });
    } catch (err) {
      console.error("Error GET /admin/places/pending:", err.message);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

/* ============================================================
   PATCH /places/:id/status
   Cambiar estado de un lugar (approved / rejected)
============================================================ */
router.patch(
  "/places/:id/status",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const allowed = ["approved", "rejected"];
      const { status } = req.body;

      if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const place = await Place.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!place) return res.status(404).json({ error: "No encontrado" });

      res.json({ place });
    } catch (err) {
      console.error("Error PATCH /places/:id/status:", err.message);
      res.status(500).json({ error: "No se pudo actualizar el estado" });
    }
  }
);

/* ============================================================
   PATCH /places/:id
   Editar datos del lugar (solo admin)
============================================================ */
router.patch(
  "/places/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, location } = req.body;

      const update = {};

      if (title) update.title = title;
      if (description) update.description = description;

      if (location && location.coordinates) {
        update.location = location;
      }

      const place = await Place.findByIdAndUpdate(id, update, { new: true });

      if (!place) return res.status(404).json({ error: "No encontrado" });

      res.json({ place });
    } catch (err) {
      console.error("Error PATCH /places/:id:", err.message);
      res.status(500).json({ error: "No se pudo actualizar el lugar" });
    }
  }
);

/* ============================================================
   DELETE /places/:id
   Eliminar un lugar (solo admin)
============================================================ */
router.delete(
  "/places/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const place = await Place.findByIdAndDelete(req.params.id);

      if (!place) return res.status(404).json({ error: "No encontrado" });

      res.status(204).end();
    } catch (err) {
      console.error("Error DELETE /places/:id:", err.message);
      res.status(500).json({ error: "No se pudo eliminar el lugar" });
    }
  }
);

export default router;
