import express from 'express';
import cors from 'cors';

import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { initializeMercadoPago } from './controllers/paymentController';
import { onRequest } from 'firebase-functions/https';

// ✅ Inicializar MercadoPago con manejo de errores
try {
  initializeMercadoPago();
  console.log('✅ MercadoPago inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando MercadoPago:', error);
}

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

// ✅ Ruta de test en la raíz para verificar que funciona
app.get('/', (req, res) => {
  return res.json({ 
    message: '✅ Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/*'],
    version: '1.0.0'
  });
});

// ✅ Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, req.body);
  next();
});

// Rutas
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);

// ✅ Manejo de errores global
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error en la aplicación:', error);
  return res.status(500).json({ 
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

// ✅ Manejo de rutas no encontradas
app.use('*', (req, res) => {
  return res.status(404).json({ 
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /api/is-admin/:uid',
      'POST /api/assign-admin',
      'POST /api/webhook/mercadopago',
      'GET /api/webhook/test',
      'POST /api/create-pending',
      'POST /api/payments/create-preference',
      'GET /api/payments/test-config'
    ]
  });
});

// ✅ Para Firebase Functions v2 con configuración específica
export const backend = onRequest(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    maxInstances: 10
  },
  app
);