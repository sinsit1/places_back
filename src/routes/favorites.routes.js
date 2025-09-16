import { Router } from 'express';
import User from '../models/User.js';
import Place from '../models/Place.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/users/me/favorites/:placeId', requireAuth, async (req, res) => {
  const { placeId } = req.params;
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { favorites: placeId } });
  const me = await User.findById(req.user.id).lean();
  res.json({ favorites: me.favorites });
});

router.delete('/users/me/favorites/:placeId', requireAuth, async (req, res) => {
  const { placeId } = req.params;
  await User.findByIdAndUpdate(req.user.id, { $pull: { favorites: placeId } });
  const me = await User.findById(req.user.id).lean();
  res.json({ favorites: me.favorites });
});

router.get('/users/me/favorites', requireAuth, async (req, res) => {
  const me = await User.findById(req.user.id).populate({
    path: 'favorites',
    match: { status: 'approved' }
  }).lean();
  res.json({ data: me.favorites || [] });
});

export default router;
