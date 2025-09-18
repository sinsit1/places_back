import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../utils/mailer.js';

const router = Router();

// 📌 Registro
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Faltan campos' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email ya registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token
  });
});

// 📌 Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token
  });
});

// 📌 Logout (opcional, si usas localStorage en frontend realmente basta con borrar allí el token)
router.post('/logout', (req, res) => {
  res.status(204).end();
});

// 📌 Obtener usuario logueado
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.json({ user: null });

  const token = auth.split(' ')[1];
  if (!token) return res.json({ user: null });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.json({ user: null });
  }
});

// 📌 Olvidé mi contraseña
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'Si el email existe, recibirás instrucciones' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const resetUrl = `${process.env.FRONT_URL}/reset-password/${token}`;

  await sendEmail(
    user.email,
    'Recuperación de contraseña',
    `Haz clic en este enlace para restablecer tu contraseña: ${resetUrl}`
  );

  res.json({ message: 'Si el email existe, recibirás instrucciones' });
});

// 📌 Resetear contraseña
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'La contraseña es requerida' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const hash = await bcrypt.hash(password, 10);
    user.passwordHash = hash;
    await user.save();

    res.json({ message: 'Contraseña restablecida correctamente ✅' });
  } catch {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
