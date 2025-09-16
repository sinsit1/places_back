import 'dotenv/config';
import mongoose from 'mongoose';
import cors from 'cors';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const app = createApp();

    // 👉 Configuración de CORS
    app.use(cors({
      origin: "http://localhost:4173", // frontend de Vite
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
