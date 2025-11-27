import { Router } from "express";
import Place from "../models/Place.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/* ============================================================
   GET /places/map
   Devuelve TODOS los lugares (solo lo necesario para el mapa)
============================================================ */
router.get("/places/map", async (req, res) => {
  try {
    const places = await Place.find(
      {},
      "title description location avgRating reviewsCount"
    ).lean();

    res.json({ data: places });

  } catch (err) {
    console.error("❌ Error GET /places/map:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   GET /places/:id
   Devuelve el detalle completo con reviews + autor
============================================================ */
router.get("/places/:id", async (req, res) => {
  try {
    const place = await Place.findById(req.params.id)
      .populate({
        path: "reviews",
        populate: { path: "author", select: "name _id" }
      })
      .lean();

    if (!place) {
      return res.status(404).json({ error: "No encontrado" });
    }

    // 🔥 Evitar 500 si no existe reviews (seed nuevo, sin reviews)
    if (!place.reviews) place.reviews = [];

    res.json({ place });

  } catch (err) {
    console.error("❌ Error GET /places/:id:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   POST /places
   Crear un lugar (solo JSON)
============================================================ */
router.post("/places", requireAuth, async (req, res) => {
  try {
    const { title, description, location, avgRating } = req.body;

    if (!title || !description || !location?.coordinates) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2 ||
      isNaN(location.coordinates[0]) ||
      isNaN(location.coordinates[1])
    ) {
      return res.status(400).json({ error: "Coordenadas inválidas" });
    }

    const place = await Place.create({
      title,
      description,
      location,
      avgRating: avgRating ?? 0,
      reviewsCount: 0,
      reviews: [],
    });

    res.status(201).json({ place });

  } catch (err) {
    console.error("❌ Error POST /places:", err);
    res.status(400).json({ error: "No se pudo crear el lugar" });
  }
});

/* ============================================================
   ADMIN — Ver lugares pendientes
============================================================ */
router.get(
  "/admin/places/pending",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const data = await Place.find({ status: "pending" })
        .sort({ createdAt: 1 })
        .lean();

      res.json({ data });

    } catch (err) {
      console.error("❌ Error GET /admin/places/pending:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

/* ============================================================
   ADMIN — Cambiar estado
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

      if (!place) {
        return res.status(404).json({ error: "No encontrado" });
      }

      res.json({ place });

    } catch (err) {
      console.error("❌ Error PATCH /places/:id/status:", err);
      res.status(500).json({ error: "No se pudo actualizar el estado" });
    }
  }
);

/* ============================================================
   ADMIN — Editar un lugar
============================================================ */
router.patch(
  "/places/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { title, description, location, avgRating } = req.body;
      const update = {};

      if (title) update.title = title;
      if (description) update.description = description;
      if (avgRating !== undefined) update.avgRating = avgRating;
      if (location?.coordinates) update.location = location;

      const place = await Place.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true }
      );

      if (!place) {
        return res.status(404).json({ error: "No encontrado" });
      }

      res.json({ place });

    } catch (err) {
      console.error("❌ Error PATCH /places/:id:", err);
      res.status(500).json({ error: "No se pudo actualizar el lugar" });
    }
  }
);

/* ============================================================
   ADMIN — Eliminar un lugar
============================================================ */
router.delete(
  "/places/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const place = await Place.findByIdAndDelete(req.params.id);

      if (!place) {
        return res.status(404).json({ error: "No encontrado" });
      }

      res.status(204).end();

    } catch (err) {
      console.error("❌ Error DELETE /places/:id:", err);
      res.status(500).json({ error: "No se pudo eliminar el lugar" });
    }
  }
);

export default router;
