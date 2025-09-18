import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
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

  app.use('/api/auth', authRoutes);
  app.use('/api', placeRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api', favoritesRoutes);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return app;
};
