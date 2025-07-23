import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as functions from 'firebase-functions';

dotenv.config();

import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { initializeMercadoPago } from './controllers/paymentController';

// ✅ Inicializar MercadoPago ANTES de crear rutas
initializeMercadoPago();

const app = express();

// CORS para Firebase Functions
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS, DELETE');
  res.set('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  next();
});

app.use(express.json());

// Rutas
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);

// ✅ Solo para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

// ✅ Para Firebase Functions
export const backend = functions.https.onRequest(app);