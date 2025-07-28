    import express from 'express';
    import cors from 'cors';
    import dotenv from 'dotenv';
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';

    dotenv.config();
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    const db = admin.firestore();

    import adminRoutes from './routes/adminRoutes';
    import paymentRoutes from './routes/paymentRoutes';
    import { initializeMercadoPago } from './controllers/paymentController';
    import { onSchedule } from 'firebase-functions/v2/scheduler';

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


    // ✅ Para Firebase Functions
    exports.backend = functions.https.onRequest(app);
    // ✅ Cloud Function programada para vencer membresías
export const actualizarMembresiasVencidas = onSchedule(
  {
    schedule: 'every 5 minutes', // ponelo corto para pruebas
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  async () => {
    const ahora = new Date();
    console.log('⏱ Ejecutando función a:', ahora.toISOString());

    const snapshot = await db.collection('students')
      .where('membresia.estado', '==', 'activa')
      .get();

    if (snapshot.empty) {
      console.log('⚠️ No hay estudiantes con membresía activa');
      return;
    }

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const fechaHasta = data.membresia?.fechaHasta?.toDate();

      console.log(`🔍 Revisando ${data.fullName}:`, fechaHasta);

      if (fechaHasta && fechaHasta < ahora) {
        console.log(`❌ Vencido: ${data.fullName}`);
        batch.update(doc.ref, { 'membresia.estado': 'vencido' });
      } else {
        console.log(`✅ Aún vigente: ${data.fullName}`);
      }
    });

    await batch.commit();
    console.log('✅ Membresías vencidas actualizadas');
  }
);