import jwt from "jsonwebtoken";

// 📌 Middleware para comprobar que el usuario está autenticado
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 👉 Guardamos la info del usuario en req.user
    req.user = {
      id: payload.id,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (err) {
    console.error("❌ requireAuth:", err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// 📌 Middleware para comprobar que el usuario tiene un rol específico
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: "No autorizado" });
    }
    next();
  };
}
