// src/routes/paymentRoutes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';

const router = Router();

// 🎯 RUTAS DE WEBHOOK
router.post('/webhook/mercadopago', PaymentController.handleMercadoPagoWebhook);
router.get('/webhook/test', PaymentController.testWebhook);

// 🎯 RUTAS DE PAGOS
router.post('/payments/create-preference', PaymentController.createPaymentPreference);
router.get('/payments/test-config', PaymentController.testConfiguration);

export default router;