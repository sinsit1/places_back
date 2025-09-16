import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import placeRoutes from './routes/places.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import favoritesRoutes from './routes/favorites.routes.js';

export const createApp = () => {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api', placeRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api', favoritesRoutes);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  return app;
};
