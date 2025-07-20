import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { initializeMercadoPago } from './controllers/paymentController';

// Cargar variables de entorno
dotenv.config();

async function testMercadoPagoConfig() {
  console.log('🧪 === TESTING MERCADO PAGO CONFIGURATION ===\n');

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  // 1. Verificar variables de entorno
  console.log('1️⃣ Verificando variables de entorno...');
  console.log(`   MP_ACCESS_TOKEN: ${process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   MP_PUBLIC_KEY: ${process.env.MP_PUBLIC_KEY ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || '❌ No configurado'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ No configurado'}\n`);

  if (!process.env.MP_ACCESS_TOKEN) {
    console.log('❌ Error: MP_ACCESS_TOKEN no está configurado en .env');
    return;
  }

  // 2. Inicializar Mercado Pago
  console.log('2️⃣ Inicializando Mercado Pago...');
  const mpOk = initializeMercadoPago();

  if (!mpOk) {
    console.log('❌ Falló la inicialización de Mercado Pago');
    return;
  }
  console.log('✅ Mercado Pago inicializado correctamente\n');

  // 3. Verificar que el servidor esté corriendo
  console.log('3️⃣ Verificando que el servidor esté corriendo...');
  try {
    const healthCheck = await fetch(`${baseUrl}/api/webhook/test`);
    if (healthCheck.ok) {
      console.log('✅ Servidor corriendo correctamente\n');
    } else {
      console.log('❌ Servidor no responde correctamente\n');
      return;
    }
  } catch (error) {
    console.log('❌ Servidor no está corriendo. Ejecuta: npm run dev\n');
    return;
  }

  // 4. Verificar configuración de MP en el backend
  console.log('4️⃣ Verificando configuración de Mercado Pago desde el backend...');
  const configResponse = await fetch(`${baseUrl}/api/payments/test-config`);
  const configData = await configResponse.json();

  console.log('📋 Resultado del test de configuración:');
  console.log(JSON.stringify(configData, null, 2));

  if (!configResponse.ok) {
    console.log('\n❌ Error en configuración de MP');
    return;
  }

  console.log('\n✅ Configuración de MP correcta');

  // 5. Crear una preferencia de prueba
  console.log('\n5️⃣ Creando preferencia de prueba...');
  const testPaymentData = {
    paymentData: {
      fullName: "Usuario de Prueba",
      amount: 10000,
      method: "Mercado Pago Hospedado",
      date: new Date().toISOString(),
      facturado: false,
      plan: "Plan Test",
      studentId: "test-student-123",
      studentEmail: "test@example.com"
    }
  };

  const preferenceResponse = await fetch(`${baseUrl}/api/payments/create-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPaymentData)
  });

  const preferenceData = await preferenceResponse.json();

  console.log('🎯 Resultado de crear preferencia:');
  console.log(JSON.stringify(preferenceData, null, 2));

  if (preferenceResponse.ok && preferenceData.init_point) {
    console.log('\n🎉 ¡TODO FUNCIONANDO CORRECTAMENTE!');
    console.log(`💳 URL de pago de prueba: ${preferenceData.init_point}`);
    console.log('\n✅ Tu integración con Mercado Pago está lista');
  } else {
    console.log('\n❌ Error creando preferencia:', preferenceData);
  }

  console.log('\n🏁 === TEST COMPLETADO ===');
}

testMercadoPagoConfig();
