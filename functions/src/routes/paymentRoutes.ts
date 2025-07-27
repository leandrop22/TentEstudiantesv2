
// src/routes/paymentRoutes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';


const router = Router();

// 🎯 RUTAS DE WEBHOOK
router.post('/webhook/mercadopago', PaymentController.handleMercadoPagoWebhook);
router.get('/webhook/test', PaymentController.testWebhook);

// 🎯 RUTAS DE PAGOS
router.post('/create-pending', PaymentController.createPendingPayment);
router.post('/payments/create-preference', PaymentController.createPaymentPreference); // 🆕 NUEVA RUTA
router.get('/payments/test-config', PaymentController.testConfiguration);
router.post('/payments/confirm', PaymentController.confirmPayment);

export default router;