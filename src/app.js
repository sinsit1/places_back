import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import placeRoutes from './routes/places.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import favoritesRoutes from './routes/favorites.routes.js';

export const createApp = () => {
  const app = express();

  const allowedOrigins = [
    "http://localhost:5173",   // Vite local
    process.env.CLIENT_ORIGIN,
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        // permitir también herramientas tipo Postman (sin origin)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("No permitido por CORS"));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // 📂 Servir archivos estáticos (imágenes subidas)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Subir un nivel desde src para llegar a /uploads en la raíz del proyecto
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'))
  );

  // 📌 Rutas API
  app.use('/api/auth', authRoutes);
  app.use('/api', placeRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api', favoritesRoutes);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return app;
};
