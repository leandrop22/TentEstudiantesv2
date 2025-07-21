import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as functions from 'firebase-functions'; // 👈 ¡IMPORTANTE!
import * as admin from 'firebase-admin'; // 👈 ¡IMPORTANTE! Si usas Admin SDK

dotenv.config();

import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';

import { initializeMercadoPago } from './controllers/paymentController';

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

// ❌ ELIMINA ESTO: Ya no necesitas app.listen en Cloud Functions
// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en http://localhost:${PORT}`);
//   console.log(`📡 Webhook Mercado Pago: http://localhost:${PORT}/api/webhook/mercadopago`);
//   console.log(`💳 Crear preferencia: http://localhost:${PORT}/api/payments/create-preference`);
//   console.log(`🧪 Test webhook: http://localhost:${PORT}/api/webhook/test`);
//   console.log('🔧 Environment Check:');
//   console.log(`   MP_ACCESS_TOKEN: ${process.env.MP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
//   console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || '❌ Not set (required for webhook)'}`);
// });

// 🆕 NUEVO: Inicializar Firebase Admin SDK si lo usas en tu backend
admin.initializeApp(); // Solo si no lo inicializas en otro lado

// 🆕 NUEVO: Exportar la aplicación Express como una Cloud Function
exports.api = functions.https.onRequest(app); // 👈 ¡ESTA ES LA EXPORTACIÓN CLAVE!

initializeMercadoPago();