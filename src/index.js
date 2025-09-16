import 'dotenv/config';
import mongoose from 'mongoose';
import cors from 'cors';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const app = createApp();

    const allowedOrigins = [
  "http://localhost:4173",
  "http://localhost:5173",
  "https://gleaming-centaur-a0cf96.netlify.app"
];

    // Configuración de CORS
    app.use(cors({
      origin: allowedOrigins, 
      credentials: true                // permite cookies/autenticación
    }));

    app.listen(PORT, () => 
      console.log('✅ API corriendo en http://localhost:' + PORT)
    );
  } catch (err) {
    console.error('❌ Error conectando a la base de datos', err);
    process.exit(1);
  }
})();
