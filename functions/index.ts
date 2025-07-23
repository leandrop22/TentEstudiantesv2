import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as functions from 'firebase-functions'; // 👈 ¡IMPORTANTE!


dotenv.config();





import adminRoutes from './src/routes/adminRoutes';
import paymentRoutes from './src/routes/paymentRoutes';
import { initializeMercadoPago } from './src/controllers/paymentController';

const app = express();

// Configuración de CORS (ajustar para producción)
// En producción, el 'origin' debe ser tu dominio de Firebase Hosting:
// 'https://tentcowork-estudiantes-v2.web.app'
// Para desarrollo, puedes mantener 'http://localhost:5173'
app.use(cors({
  origin: [
    'https://estudiantes.tentcowork.com',
    'http://localhost:3000',  // ✅ CORREGIDO
    'http://localhost:5173',  // ✅ AGREGAR VITE TAMBIÉN
    'https://tentcowork-estudiantes-v2.web.app',
    'https://tentcowork-estudiantes-v2.firebaseapp.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ✅ AGREGAR OPTIONS
  credentials: true
}));
app.use(express.json());

// Rutas
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);




// 🆕 NUEVO: Exportar la aplicación Express como una Cloud Function
exports.backend = functions.https.onRequest(app);

initializeMercadoPago();