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
    schedule: 'every 8 hours',
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  async () => {
    const ahora = new Date();
    /* console.log('⏱ Ejecutando función a:', ahora.toISOString()); */


    const snapshot = await db.collection('students')
      .where('membresia.estado', '==', 'activa')
      .get();

    if (snapshot.empty) {
      /* console.log('⚠️ No hay estudiantes con membresía activa'); */

      return;
    }

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const fechaHasta = data.membresia?.fechaHasta?.toDate();

      /* console.log(`🔍 Revisando ${data.fullName}:`, fechaHasta); */


      if (fechaHasta && fechaHasta < ahora) {
        /* console.log(`❌ Vencido: ${data.fullName}`); */

        batch.update(doc.ref, { 'membresia.estado': 'vencido' });
      } else {
        /* console.log(`✅ Aún vigente: ${data.fullName}`); */

      }
    });

    await batch.commit();
    /* console.log('✅ Membresías vencidas actualizadas'); */

  }
);

export const cerrarSesionesActivas = onSchedule(
  {
    schedule: '30 21 * * *', // todos los días a las 21:30
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  async () => {
    const ahora = new Date();
    // console.log('⏱ Ejecutando cierre automático a:', ahora.toISOString());
    
    try {
      // Buscar sesiones abiertas (sin checkOutTimestamp)
      const snapshot = await db.collection('sessions')
        .where('checkOutTimestamp', '==', null)
        .get();

      if (snapshot.empty) {
        // console.log('✅ No hay sesiones activas para cerrar');
        return;
      }

      const batch = db.batch();
      let sessionsCerradas = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const { checkInTimestamp, fullName, email, studentId } = data;
        
        // Verificar que existe checkInTimestamp
        if (!checkInTimestamp) {
          // console.log(`⚠️ Sesión ${doc.id} sin checkInTimestamp, ignorando`);
          return;
        }

        const checkInDate = checkInTimestamp.toDate();
        
        // ✅ CLAVE: Crear fecha de cierre a las 21:30 del MISMO DÍA del check-in
        const fechaCierre = new Date(checkInDate);
        fechaCierre.setHours(21, 30, 0, 0); // 21:30:00.000
        
        // Solo cerrar si ya pasó la hora de cierre de ese día
        if (ahora >= fechaCierre) {
          // Calcular duración desde check-in hasta las 21:30 de ese día
          const durationMs = fechaCierre.getTime() - checkInDate.getTime();
          const durationMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));
          
          // Actualizar documento con checkOut y duración
          batch.update(doc.ref, {
            checkOutTimestamp: fechaCierre, // ✅ Usar 21:30 del día de check-in
            durationMinutes: durationMinutes,
          });
          
          /* console.log(`❌ Cerrando sesión automáticamente:`, {
            id: doc.id,
            estudiante: fullName,
            email: email,
            studentId: studentId,
            checkIn: checkInDate.toLocaleString('es-AR'),
            checkOut: fechaCierre.toLocaleString('es-AR'),
            duracionMinutos: durationMinutes,
            duracionHoras: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
          }); */
          
          sessionsCerradas++;
        } else {
          // console.log(`⏳ Sesión de ${fullName} aún no alcanzó las 21:30 de su día de check-in`);
        }
      });

      if (sessionsCerradas > 0) {
        await batch.commit();
        // console.log(`✅ ${sessionsCerradas} sesiones cerradas automáticamente a las 21:30`);
      } else {
        // console.log('ℹ️ No hay sesiones que requieran cierre en este momento');
      }

    } catch (error) {
      console.error('❌ Error en cierre automático:', error);
      throw error; // Re-lanzar para que Cloud Functions lo registre
    }
  }
);