import dotenv from 'dotenv';
dotenv.config(); // 👈 MOVER AL PRINCIPIO

import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';

import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { initializeMercadoPago } from './controllers/paymentController';

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// Configuración de CORS
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://tentcowork-estudiantes-v2.web.app', 
    'https://tentcowork-estudiantes-v2.firebaseapp.com',
    'https://estudiantes.tentcowork.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend funcionando correctamente!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Inicializar MercadoPago
initializeMercadoPago();

// 🆕 AÑADIR: Servidor local para desarrollo
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${PORT}`);
    console.log(`📡 API endpoints disponibles en http://localhost:${PORT}/api`);
  });
}

// 🔧 EXPORTAR SIN SECRETS (usando variables de entorno normales)
export const backend = onRequest({
  region: 'us-central1',
  cors: true
}, app);