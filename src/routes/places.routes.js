import { Router } from "express";
import Place from "../models/Place.js";
import Review from "../models/Review.js";
import jwt from "jsonwebtoken";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/* ============================================================
   GET /places/map
============================================================ */
router.get("/places/map", async (req, res) => {
  try {
    const places = await Place.find(
      {},
      "title description location avgRating reviewsCount status"
    ).lean();

    res.json({ data: places });

  } catch (err) {
    console.error("❌ Error GET /places/map:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   GET /places/:id
   Devuelve place + alreadyReviewed
============================================================ */
router.get("/places/:id", async (req, res) => {
  try {
    let userId = null;

    // Extraer token si existe
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    const place = await Place.findById(req.params.id)
      .populate({
        path: "reviews",
        populate: { path: "author", select: "name _id" }
      })
      .lean();

    if (!place) {
      return res.status(404).json({ error: "No encontrado" });
    }

    if (!place.reviews) place.reviews = [];

    // FLAG: comprobar si el usuario ya opinó
    let alreadyReviewed = false;

    if (userId) {
      const review = await Review.findOne({
        place: req.params.id,
        author: userId,
      }).lean();

      alreadyReviewed = !!review;
    }

    res.json({
      place,
      alreadyReviewed
    });

  } catch (err) {
    console.error("❌ Error GET /places/:id:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ============================================================
   POST /places  (crear lugar)
============================================================ */
router.post("/places", requireAuth, async (req, res) => {
  try {
    const { title, description, location, avgRating } = req.body;

    if (!title || !description || !location?.coordinates) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const place = await Place.create({
      title,
      description,
      location,
      avgRating: avgRating ?? 0,
      reviewsCount: 0,
      reviews: [],
      status: "pending",    // 🔥 IMPORTANTE: para que salga en admin
      author: req.user.id,  // recomendable
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

      if (title !== undefined) update.title = title;
      if (description !== undefined) update.description = description;
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
