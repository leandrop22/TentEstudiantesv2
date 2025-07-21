import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

dotenv.config();

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
    'https://tentcowork-estudiantes-v2.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

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

// Exportar para Firebase Functions
export const backend = functions.https.onRequest(app);