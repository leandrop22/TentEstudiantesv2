// src/controllers/paymentController.ts
import { Request, Response } from 'express';

// 🔧 IMPORTAR MERCADO PAGO VERSIÓN NUEVA
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { admin, db } from '../config/firebase';
import { CreatePreferenceRequest, MercadoPagoPaymentStatus, MercadoPagoPreferenceResponse, MercadoPagoWebhookData, PaymentRecord } from '../types/mercadoPago';

// 🔧 CONFIGURAR MERCADO PAGO (NUEVA SINTAXIS) - CORREGIDA
let client: MercadoPagoConfig | null = null;
let preference: Preference | null = null; 
let payment: Payment | null = null;

// 🔧 INICIALIZACIÓN CORREGIDA
export function initializeMercadoPago() {
  /* console.log('🔧 Inicializando Mercado Pago...'); */

  
  const token = process.env.MP_ACCESS_TOKEN;
  /* console.log('Token presente:', !!token); */

  
  if (!token) {
    /* console.log('❌ MP_ACCESS_TOKEN no encontrado'); */

    return false;
  }

  if (!token.startsWith('APP_USR-')) {
    /* console.log('❌ Token formato incorrecto'); */

    return false;
  }

  try {
    // 🔧 USAR EXACTAMENTE LA MISMA CONFIGURACIÓN QUE FUNCIONA EN EL TEST
    client = new MercadoPagoConfig({ 
      accessToken: token.trim()
    });
    
    preference = new Preference(client);
    payment = new Payment(client);
    
    /* console.log('✅ Mercado Pago inicializado correctamente'); */

    /* console.log('  - Cliente:', !!client); */

    /* console.log('  - Preference:', !!preference); */

    /* console.log('  - Payment:', !!payment); */

    
    return true;
    
  } catch (error: any) {
    console.error('❌ Error inicializando MP:', error.message);
    client = null;
    preference = null;
    payment = null;
    return false;
  }
}

// 🔧 INICIALIZAR AL CARGAR EL MÓDULO
let mpInitialized = initializeMercadoPago();

// Función para inicializar bajo demanda
function ensureMPInitialized(): boolean {
  if (!mpInitialized) {
    mpInitialized = initializeMercadoPago();
  }
  return mpInitialized;
}

class PaymentController {
  /**
   * Test simple para debugging
   */
  static async testConfirmSimple(req: Request, res: Response): Promise<void> {
    res.json({ 
      message: 'Test confirm simple working',
      timestamp: new Date().toISOString(),
      body: req.body
    });
  }


  /**
   * 🎯 CONFIRMAR PAGO DESDE FRONTEND
   * Endpoint llamado desde ProfileInfo cuando el usuario vuelve de Mercado Pago
   */
  static async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      /* console.log('=== CONFIRMANDO PAGO DESDE FRONTEND ==='); */

      /* console.log('Body recibido:', req.body); */

      
      const { paymentId, collectionId, status, externalReference } = req.body;
      
      if (!paymentId && !collectionId) {
        res.status(400).json({ 
          success: false, 
          message: 'No se proporcionó payment_id ni collection_id' 
        });
        return;
      }

      // Verificar que MP esté inicializado
      if (!ensureMPInitialized() || !payment) {
        /* console.log('❌ Mercado Pago no está inicializado'); */

        res.status(500).json({ 
          success: false,
          message: 'Error de configuración del servidor'
        });
        return;
      }

      // Obtener información del pago desde MP
      const mpPaymentId = paymentId || collectionId;
      const numericPaymentId = parseInt(mpPaymentId);
      
      if (isNaN(numericPaymentId)) {
        res.status(400).json({ 
          success: false, 
          message: 'ID de pago inválido' 
        });
        return;
      }

      /* console.log('Obteniendo pago de MP con ID:', numericPaymentId); */

      const mpPaymentResponse = await payment.get({ id: numericPaymentId });
      
      /* console.log('Respuesta de MP:', JSON.stringify(mpPaymentResponse, null, 2)); */


      if (mpPaymentResponse.status === 'approved') {
        // Buscar si ya existe el pago en nuestra BD
        const existingPayment = await PaymentController.findPaymentByMercadoPagoId(mpPaymentId);
        
        if (existingPayment) {
          /* console.log('✅ Pago ya existe y está procesado'); */

          res.json({ 
            success: true, 
            message: 'Pago ya confirmado anteriormente',
            paymentId: existingPayment.id
          });
          return;
        }

        // Extraer studentId y plan del external_reference
        const referenceData = (externalReference || mpPaymentResponse.external_reference || '').split('|');
        const studentId = referenceData[0];
        const planFromReference = referenceData[1];
        
        if (!studentId) {
          res.status(400).json({ 
            success: false, 
            message: 'No se pudo identificar al estudiante' 
          });
          return;
        }

        // Obtener datos del estudiante
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
          res.status(404).json({ 
            success: false, 
            message: 'Estudiante no encontrado' 
          });
          return;
        }

        const studentData = studentDoc.data();
        // Usar el plan del external_reference, luego el del estudiante, luego default
        const planName = planFromReference || studentData?.plan || 'Plan no especificado';
        const planPrice = mpPaymentResponse.transaction_amount || 0;
        
        /* console.log('Plan extraído:', planName); */

        /* console.log('Precio del plan:', planPrice); */

        
        // ✅ CALCULAR FECHAS SEGÚN TIPO DE PLAN (igual que PaymentsTable)
        const isPaseDiario = (planName: string, price: number = 0) => {
          const nombre = planName.toLowerCase();
          return nombre.includes('diario') || 
                 nombre.includes('día') || 
                 nombre.includes('day') ||
                 (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
                 price <= 8000;
        };

        const calcularFechasPlan = (planName: string, price: number, fechaPago: Date) => {
          let fechaDesde: Date;
          let fechaHasta: Date;

          if (isPaseDiario(planName, price)) {
            // Para pase diario: desde el momento del pago hasta las 23:59:59 del mismo día
            fechaDesde = new Date(fechaPago);
            fechaHasta = new Date(fechaPago);
            fechaHasta.setHours(23, 59, 59, 999);
          } else {
            // Para planes mensuales: desde la fecha del pago hasta 30 días después
            fechaDesde = new Date(fechaPago);
            fechaHasta = new Date(fechaPago);
            fechaHasta.setDate(fechaHasta.getDate() + 30);
          }

          return {
            fechaDesde: admin.firestore.Timestamp.fromDate(fechaDesde),
            fechaHasta: admin.firestore.Timestamp.fromDate(fechaHasta)
          };
        };

        // Calcular fechas según el tipo de plan
        const fechaPago = new Date(); // Fecha actual como confirmación
        const { fechaDesde, fechaHasta } = calcularFechasPlan(planName, planPrice, fechaPago);
        
        // Crear el registro de pago
        const paymentRecord = {
          studentId: studentId,
          fullName: studentData?.fullName || 'Nombre no disponible',
          amount: planPrice,
          method: 'Mercado Pago Hospedado',
          date: fechaPago.toISOString().split('T')[0],
          facturado: true,
          plan: planName,
          mercadoPagoId: mpPaymentId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const paymentDocRef = await db.collection('payments').add(paymentRecord);
        /* console.log('✅ Pago creado en BD:', paymentDocRef.id); */


        // Actualizar membresía del estudiante con fechas específicas según el plan
        const studentRef = db.collection('students').doc(studentId);
        const studentUpdateData: any = {
          plan: planName,
          'membresia.nombre': planName,
          'membresia.estado': 'activa',
          'membresia.montoPagado': planPrice,
          'membresia.medioPago': 'Mercado Pago Hospedado',
          'membresia.fechaDesde': fechaDesde,
          'membresia.fechaHasta': fechaHasta,
          activo: true
        };
        
        /* console.log('Actualizando estudiante con fechas específicas:'); */

        /* console.log('  - Plan:', planName); */

        /* console.log('  - Es pase diario:', isPaseDiario(planName, planPrice)); */

        /* console.log('  - Fecha desde:', fechaDesde.toDate().toISOString()); */

        /* console.log('  - Fecha hasta:', fechaHasta.toDate().toISOString()); */

        
        await studentRef.update(studentUpdateData);
        /* console.log('✅ Membresía del estudiante activada con fechas correctas'); */


        res.json({ 
          success: true, 
          message: 'Pago confirmado y membresía activada',
          paymentId: paymentDocRef.id,
          vigencia: isPaseDiario(planName, planPrice) 
            ? 'hasta las 23:59 de hoy' 
            : '30 días desde hoy'
        });

      } else {
        /* console.log('❌ El pago no está aprobado. Estado:', mpPaymentResponse.status); */

        res.json({ 
          success: false, 
          message: `Pago no aprobado. Estado: ${mpPaymentResponse.status}` 
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error confirmando pago:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  /**
   * 🎯 WEBHOOK DE MERCADO PAGO
   * Endpoint que recibe las notificaciones de MP cuando cambia el estado de un pago
   */
  static async handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
    try {
      /* console.log('=== WEBHOOK MERCADO PAGO RECIBIDO ==='); */

      /* console.log('Headers:', req.headers); */

      /* console.log('Body:', JSON.stringify(req.body, null, 2)); */

      
      const webhookData: MercadoPagoWebhookData = req.body;
      
      // Validar datos del webhook
      if (!webhookData.type || !webhookData.data?.id) {
        /* console.log('❌ Webhook data inválida'); */

        res.status(400).json({ 
          error: 'Invalid webhook data', 
          received: webhookData 
        });
        return;
      }
      
      // Solo procesar notificaciones de pagos
      if (webhookData.type !== 'payment') {
        /* console.log('Webhook ignorado - no es un pago'); */

        res.status(200).json({ message: 'Webhook ignored - not a payment' });
        return;
      }

      // 🔧 EL ID VIENE COMO STRING PERO MP LO MANEJA COMO NUMBER
      const paymentId = webhookData.data.id;
      /* console.log('ID del pago en Mercado Pago:', paymentId); */


      // Obtener información del pago desde MP
      const paymentInfo = await PaymentController.getPaymentFromMercadoPago(paymentId);
      /* console.log('Info del pago desde MP:', JSON.stringify(paymentInfo, null, 2)); */


      // Buscar el pago en nuestra base de datos usando el ID como string
      const payment = await PaymentController.findPaymentByMercadoPagoId(paymentId);
      
      if (!payment) {
        /* console.log('❌ Pago no encontrado en nuestra base de datos'); */

        res.status(404).json({ error: 'Payment not found in database' });
        return;
      }

      /* console.log('✅ Pago encontrado en BD:', payment); */


      // Procesar según el estado del pago
      await PaymentController.processPaymentStatus(payment, paymentInfo);
      
      // ✅ Responder exitosamente
      /* console.log('✅ Webhook procesado exitosamente'); */

      res.status(200).json({ 
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
        paymentId: paymentId
      });
      
    } catch (error: any) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🎯 CREAR PREFERENCIA DE PAGO
   * Endpoint llamado desde el frontend para crear una preferencia en MP
   */
  static async createPaymentPreference(req: Request<{}, MercadoPagoPreferenceResponse, CreatePreferenceRequest>, res: Response): Promise<void> {
    try {
      /* console.log('=== CREANDO PREFERENCIA MERCADO PAGO ==='); */

      
      // 🔧 VERIFICAR QUE MP ESTÉ INICIALIZADO
      if (!ensureMPInitialized() || !client || !preference) {
        /* console.log('❌ Mercado Pago no está inicializado'); */

        res.status(500).json({ 
          error: 'Mercado Pago client not initialized',
          details: 'Check MP_ACCESS_TOKEN configuration'
        } as any);
        return;
      }

      const { paymentData } = req.body;
      
      // Validar datos requeridos
      if (!paymentData) {
        res.status(400).json({ error: 'Payment data is required' } as any);
        return;
      }

      const { fullName, amount, plan, studentId, studentEmail } = paymentData;
      
      if (!fullName || !amount || !plan || !studentId) {
        res.status(400).json({ error: 'Missing required payment data' } as any);
        return;
      }

      console.log('Payment data received:', {
        fullName,
        amount,
        plan,
        studentId,
        studentEmail: studentEmail || 'no-email'
      });

      //urls producción 
      const frontendUrl = process.env.FRONTEND_URL || 'https://estudiantes.tentcowork.com';
      const backendUrl = process.env.BACKEND_URL || 'https://backend-h2yatjzgba-uc.a.run.app';
      // urls desarrollo  
     // const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      //const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

      // 🔧 CREAR LA PREFERENCIA CON CONFIGURACIÓN QUE FUNCIONA
      const preferenceData = {
        items: [{
          id: `plan-${studentId}-${Date.now()}`,
          title: `Plan ${plan} - ${fullName}`,
          description: `Suscripción mensual al plan ${plan}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        }],
        payer: {
          email: studentEmail || `${studentId}@tent-default.com`,
        },
        back_urls: {
          success: `${frontendUrl}/payment/success`,
          failure: `${frontendUrl}/payment/failure`, 
          pending: `${frontendUrl}/payment/pending`,
        },
        notification_url: `${backendUrl}/webhook/mercadopago`,
        external_reference: studentId,
        statement_descriptor: 'TENTCOWORK',
      };

      /* console.log('Preference data:', JSON.stringify(preferenceData, null, 2)); */


      // 🔧 CREAR LA PREFERENCIA CON NUEVA API
      const response = await preference.create({ body: preferenceData });
      
      if (!response || !response.id) {
        throw new Error('Invalid response from Mercado Pago');
      }

      console.log('✅ Preferencia creada exitosamente:', {
        id: response.id,
        init_point: response.init_point
      });
      
      // Responder con los datos de la preferencia
      const responseData: MercadoPagoPreferenceResponse = {
        id: response.id!,
        init_point: response.init_point!,
        sandbox_init_point: response.sandbox_init_point || response.init_point!,
      };

      res.json(responseData);
      
    } catch (error: any) {
      console.error('❌ Error creating Mercado Pago preference:', error);
      res.status(500).json({ 
        error: 'Error creating payment preference',
        details: error.message 
      } as any);
    }
  }

  /**
   * 🎯 CREAR PAGO PENDIENTE PARA RECEPCIÓN
   * Endpoint llamado desde el frontend para registrar un pago pendiente
   */
  static async createPendingPayment(req: Request, res: Response): Promise<void> {
    try {
      /* console.log('=== CREANDO PAGO PENDIENTE PARA RECEPCIÓN ==='); */

      
      const { paymentData } = req.body;
      
      // Validar datos requeridos
      if (!paymentData) {
        res.status(400).json({ error: 'Payment data is required' });
        return;
      }

      const { fullName, amount, plan, studentId, studentEmail } = paymentData;
      
      if (!fullName || !amount || !plan || !studentId) {
        res.status(400).json({ error: 'Missing required payment data' });
        return;
      }

      console.log('Payment data received:', {
        fullName,
        amount,
        plan,
        studentId,
        method: 'Pago en Recepción'
      });

      // Crear registro de pago pendiente en Firebase
      const paymentRecord = {
        studentId,
        fullName,
        amount,
        plan,
        method: 'Pago en Recepción',
        facturado: false, // Pendiente hasta que se confirme en recepción
        date: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        studentEmail: studentEmail || `${studentId}@cowork.com`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Guardar en la colección 'payments'
      const docRef = await db.collection('payments').add(paymentRecord);
      
      /* console.log('✅ Pago pendiente creado exitosamente:', docRef.id); */

      
      res.json({
        success: true,
        message: 'Pago pendiente registrado para recepción',
        paymentId: docRef.id
      });
      
    } catch (error: any) {
      console.error('❌ Error creating pending payment:', error);
      res.status(500).json({ 
        error: 'Error creating pending payment',
        details: error.message 
      });
    }
  }

  /**
   * Test endpoint para verificar configuración
   */
  static async testConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const hasAccessToken = !!process.env.MP_ACCESS_TOKEN;
      const hasPublicKey = !!process.env.MP_PUBLIC_KEY;
      
      /* console.log('=== VERIFICANDO CONFIGURACIÓN MP ==='); */

      /* console.log('Has Access Token:', hasAccessToken); */

      /* console.log('Has Public Key:', hasPublicKey); */

      /* console.log('MP Initialized:', mpInitialized); */

      /* console.log('Client exists:', !!client); */

      /* console.log('Preference exists:', !!preference); */

      
      if (!hasAccessToken) {
        res.status(500).json({ 
          error: 'Mercado Pago Access Token not configured',
          suggestion: 'Add MP_ACCESS_TOKEN to your .env file'
        });
        return;
      }

      if (!ensureMPInitialized() || !client || !preference || !payment) {
        res.status(500).json({ 
          error: 'Mercado Pago client not initialized',
          details: 'Check MP_ACCESS_TOKEN configuration',
          hasAccessToken,
          mpInitialized,
          clientExists: !!client,
          preferenceExists: !!preference
        });
        return;
      }

      /* console.log('✅ MP Client inicializado correctamente'); */


      res.json({
        message: 'Mercado Pago configuration is working correctly',
        hasAccessToken,
        hasPublicKey,
        backendUrl: process.env.BACKEND_URL,
        frontendUrl: process.env.FRONTEND_URL,
        webhookUrl: `${process.env.BACKEND_URL}/webhook/mercadopago`,
        clientInitialized: !!client,
        mpInitialized: ensureMPInitialized()
      });
      
    } catch (error: any) {
      console.error('❌ Error testing MP config:', error);
      res.status(500).json({ 
        error: 'Error testing Mercado Pago configuration',
        details: error.message 
      });
    }
  }

  /**
   * Test endpoint para webhook
   */
  static async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      res.json({ 
        message: 'Webhook endpoint working correctly',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Obtiene información del pago desde la API de Mercado Pago
   */
  private static async getPaymentFromMercadoPago(paymentId: string): Promise<MercadoPagoPaymentStatus> {
    try {
      if (!payment) {
        throw new Error('Mercado Pago client not initialized');
      }

      // 🔧 CONVERTIR STRING A NUMBER (MP espera number)
      const numericPaymentId = parseInt(paymentId);
      if (isNaN(numericPaymentId)) {
        throw new Error(`Invalid payment ID: ${paymentId}`);
      }

      /* console.log('Fetching payment from MP with ID:', numericPaymentId); */


      // 🔧 NUEVA SINTAXIS PARA OBTENER PAGO
      const response = await payment.get({ id: numericPaymentId });
      
      /* console.log('MP Response:', JSON.stringify(response, null, 2)); */

      
      return response as MercadoPagoPaymentStatus;
    } catch (error: any) {
      console.error('Error fetching payment from MP:', error);
      throw new Error(`Error fetching payment ${paymentId} from Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Busca el pago en nuestra base de datos usando el ID de Mercado Pago
   */
  private static async findPaymentByMercadoPagoId(mercadoPagoId: string): Promise<PaymentRecord | null> {
    try {
      const paymentsRef = db.collection('payments');
      // 🔧 BUSCAR POR STRING (como lo guardamos) O POR NUMBER (como viene de MP)
      const snapshot = await paymentsRef
        .where('mercadoPagoId', '==', mercadoPagoId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        // Intentar buscar como número también (por si acaso)
        const numericId = parseInt(mercadoPagoId);
        if (!isNaN(numericId)) {
          const snapshot2 = await paymentsRef
            .where('mercadoPagoId', '==', numericId.toString())
            .limit(1)
            .get();
          
          if (!snapshot2.empty) {
            const doc = snapshot2.docs[0];
            return {
              id: doc.id,
              ...doc.data()
            } as PaymentRecord;
          }
        }
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PaymentRecord;
    } catch (error) {
      console.error('Error finding payment in DB:', error);
      throw error;
    }
  }

  /**
   * Procesa el estado del pago y actualiza la base de datos
   */
  private static async processPaymentStatus(
    payment: PaymentRecord, 
    mpPayment: MercadoPagoPaymentStatus
  ): Promise<void> {
    try {
      /* console.log('=== PROCESANDO ESTADO DEL PAGO ==='); */

      /* console.log('Estado MP:', mpPayment.status); */


      switch (mpPayment.status) {
        case 'approved':
          await PaymentController.activateStudentPlan(payment, mpPayment);
          break;
          
        case 'rejected':
        case 'cancelled':
          await PaymentController.cancelStudentPlan(payment, mpPayment);
          break;
          
        case 'pending':
        case 'in_process':
          await PaymentController.updatePaymentStatus(payment.id, 'pending');
          break;
          
        default:
          /* console.log(`Estado no manejado: ${mpPayment.status}`); */

      }
    } catch (error) {
      console.error('Error processing payment status:', error);
      throw error;
    }
  }

  /**
   * Activa el plan del estudiante cuando el pago es aprobado
   * USA EXACTAMENTE LA MISMA LÓGICA QUE PaymentsTable con fechas específicas por tipo de plan
   */
  private static async activateStudentPlan(
    payment: PaymentRecord, 
    mpPayment: MercadoPagoPaymentStatus
  ): Promise<void> {
    try {
      /* console.log('=== ACTIVANDO PLAN DEL ESTUDIANTE ==='); */

      /* console.log('Student ID:', payment.studentId); */

      /* console.log('Plan:', payment.plan); */

      /* console.log('Monto confirmado:', mpPayment.transaction_amount); */


      // 🔧 MANEJAR CAMPOS OPCIONALES DE MP
      const confirmedAmount = mpPayment.transaction_amount || payment.amount;
      const paymentId = mpPayment.id?.toString() || 'unknown';

      // ✅ CALCULAR FECHAS SEGÚN TIPO DE PLAN (igual que confirmPayment)
      const isPaseDiario = (planName: string, price: number = 0) => {
        const nombre = planName.toLowerCase();
        return nombre.includes('diario') || 
               nombre.includes('día') || 
               nombre.includes('day') ||
               (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
               price <= 8000;
      };

      const calcularFechasPlan = (planName: string, price: number, fechaPago: Date) => {
        let fechaDesde: Date;
        let fechaHasta: Date;

        if (isPaseDiario(planName, price)) {
          // Para pase diario: desde el momento del pago hasta las 23:59:59 del mismo día
          fechaDesde = new Date(fechaPago);
          fechaHasta = new Date(fechaPago);
          fechaHasta.setHours(23, 59, 59, 999);
        } else {
          // Para planes mensuales: desde la fecha del pago hasta 30 días después
          fechaDesde = new Date(fechaPago);
          fechaHasta = new Date(fechaPago);
          fechaHasta.setDate(fechaHasta.getDate() + 30);
        }

        return {
          fechaDesde: admin.firestore.Timestamp.fromDate(fechaDesde),
          fechaHasta: admin.firestore.Timestamp.fromDate(fechaHasta)
        };
      };

      // 1. Actualizar el pago en la colección 'payments'
      const paymentUpdateData: Partial<PaymentRecord> = {
        facturado: true, // ✅ Marcar como facturado cuando MP confirma el pago
        amount: confirmedAmount, // Usar el monto confirmado por MP o el original
        method: 'Mercado Pago Hospedado', // Asegurar el método correcto
      };

      await db.collection('payments').doc(payment.id).update(paymentUpdateData);
      /* console.log('✅ Pago actualizado como facturado'); */


      // 2. Actualizar el estudiante con fechas específicas según el plan
      const studentRef = db.collection('students').doc(payment.studentId);
      
      // Calcular fechas de vigencia usando la misma lógica que confirmPayment
      const fechaPago = new Date(); // Usar la fecha actual como fecha de pago confirmado
      const { fechaDesde, fechaHasta } = calcularFechasPlan(payment.plan, confirmedAmount, fechaPago);
      
      /* console.log('Fechas calculadas:'); */

      /* console.log('  - Plan:', payment.plan); */

      /* console.log('  - Es pase diario:', isPaseDiario(payment.plan, confirmedAmount)); */

      /* console.log('  - Fecha desde:', fechaDesde.toDate().toISOString()); */

      /* console.log('  - Fecha hasta:', fechaHasta.toDate().toISOString()); */

      
      // Actualizar el estudiante - MISMA ESTRUCTURA QUE confirmPayment
      const studentUpdateData: any = {
        plan: payment.plan,
        'membresia.nombre': payment.plan,
        'membresia.estado': 'activa',
        'membresia.montoPagado': confirmedAmount,
        'membresia.medioPago': 'Mercado Pago Hospedado',
        'membresia.fechaDesde': fechaDesde, // Timestamp directo
        'membresia.fechaHasta': fechaHasta, // Timestamp directo
        activo: true
      };
      
      /* console.log('Datos de actualización del estudiante:', studentUpdateData); */

      await studentRef.update(studentUpdateData);
      /* console.log('✅ Plan y membresía del estudiante activados exitosamente'); */


      // 3. Crear notificación
      await PaymentController.createNotification(payment, mpPayment, 'plan_activated');
      
    } catch (error) {
      console.error('❌ Error activating student plan:', error);
      throw error;
    }
  }

  /**
   * Cancela el plan del estudiante cuando el pago es rechazado
   */
  private static async cancelStudentPlan(
    payment: PaymentRecord, 
    mpPayment: MercadoPagoPaymentStatus
  ): Promise<void> {
    try {
      /* console.log('=== CANCELANDO PLAN DEL ESTUDIANTE ==='); */

      
      // 1. Actualizar el pago
      await db.collection('payments').doc(payment.id).update({
        facturado: false,
        method: 'Mercado Pago Hospedado (Rechazado)',
      });

      // 2. Actualizar el estudiante
      const studentRef = db.collection('students').doc(payment.studentId);
      await studentRef.update({
        'membresia.estado': 'cancelada',
        activo: false,
      });

      /* console.log('✅ Plan del estudiante cancelado'); */


      // 3. Crear notificación
      await PaymentController.createNotification(payment, mpPayment, 'payment_failed');
      
    } catch (error) {
      console.error('❌ Error canceling student plan:', error);
      throw error;
    }
  }

  /**
   * Actualiza solo el estado del pago
   */
  private static async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    try {
      await db.collection('payments').doc(paymentId).update({
        status: status,
      });
      /* console.log(`✅ Estado del pago actualizado a: ${status}`); */

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Crea notificación para el estudiante
   */
  private static async createNotification(
    payment: PaymentRecord, 
    mpPayment: MercadoPagoPaymentStatus,
    type: 'plan_activated' | 'payment_failed'
  ): Promise<void> {
    try {
      // 🔧 MANEJAR CAMPOS OPCIONALES
      const amount = mpPayment.transaction_amount || payment.amount;
      const statusDetail = mpPayment.status_detail || 'Sin detalles';
      const mpId = mpPayment.id?.toString() || 'unknown';

      const notificationData = {
        studentId: payment.studentId,
        type: type,
        title: type === 'plan_activated' ? '¡Plan Activado!' : 'Pago no procesado',
        message: type === 'plan_activated' 
          ? `Tu plan ${payment.plan} ha sido activado exitosamente. Monto: ${amount}`
          : `Tu pago para el plan ${payment.plan} no pudo ser procesado. Razón: ${statusDetail}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: payment.id,
        mercadoPagoId: mpId,
      };

      await db.collection('notifications').add(notificationData);
      /* console.log(`✅ Notificación ${type} creada`); */

      
    } catch (error) {
      console.error('Error creating notification:', error);
      // No lanzar error para no afectar el flujo principal
    }
  } 
}

// Exportar al final del archivo
export { PaymentController };