import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; // 🆕 NUEVO: Para variables de entorno
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes'; // 🆕 NUEVO: Rutas de pagos

// 🆕 NUEVO: Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = 4000;

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:5173', // URL del frontend en desarrollo
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Rutas existentes
app.use('/api', adminRoutes);

// 🆕 NUEVO: Rutas de pagos (webhook y preferencias)
app.use('/api', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  
  // 🆕 NUEVO: Logs adicionales para webhook
  console.log(`📡 Webhook Mercado Pago: http://localhost:${PORT}/api/webhook/mercadopago`);
  console.log(`💳 Crear preferencia: http://localhost:${PORT}/api/payments/create-preference`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/api/webhook/test`);
  
  // 🆕 NUEVO: Verificar variables de entorno
  console.log('🔧 Environment Check:');
  console.log(`   MP_ACCESS_TOKEN: ${process.env.MP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || '❌ Not set (required for webhook)'}`);
});