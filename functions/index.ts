import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as functions from 'firebase-functions'; // 👈 ¡IMPORTANTE!
import * as admin from 'firebase-admin'; // 👈 ¡IMPORTANTE! Si usas Admin SDK

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
  origin: ['http://localhost:5173', 'https://tentcowork-estudiantes-v2.web.app', 'https://tentcowork-estudiantes-v2.firebaseapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Asegúrate de incluir todos los métodos HTTP que usas
  credentials: true
}));

app.use(express.json());

// Rutas
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);


// 🆕 NUEVO: Inicializar Firebase Admin SDK si lo usas en tu backend
admin.initializeApp(); // Solo si no lo inicializas en otro lado

// 🆕 NUEVO: Exportar la aplicación Express como una Cloud Function
exports.backend = functions.https.onRequest(app); 

initializeMercadoPago();