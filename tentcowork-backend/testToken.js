// testToken.js - Guarda este archivo en la raíz del backend
require('dotenv').config();

async function testTokenDirecto() {
  console.log('🔍 === PRUEBA DIRECTA DEL TOKEN MP ===\n');
  
  const token = process.env.MP_ACCESS_TOKEN;
  
  console.log('Token presente:', !!token);
  console.log('Longitud del token:', token ? token.length : 0);
  console.log('Comienza con APP_USR:', token ? token.startsWith('APP_USR-') : false);
  
  if (!token) {
    console.log('❌ No hay token');
    return;
  }
  
  console.log('Primeros 20 caracteres:', token.substring(0, 20));
  console.log('Últimos 10 caracteres:', token.substring(token.length - 10));
  
  // Test 1: Usar el SDK de MP
  try {
    console.log('\n📦 Probando SDK de Mercado Pago...');
    const { MercadoPagoConfig, Preference } = require('mercadopago');
    
    console.log('SDK importado correctamente');
    
    const client = new MercadoPagoConfig({ 
      accessToken: token 
    });
    
    console.log('✅ Cliente MP creado exitosamente');
    
    const preference = new Preference(client);
    console.log('✅ Preferencia instanciada exitosamente');
    
    // Test 2: Crear una preferencia real de prueba
    console.log('\n🧪 Probando crear preferencia real...');
    const preferenceData = {
      items: [{
        id: 'test-item',
        title: 'Test Item',
        description: 'Item de prueba',
        quantity: 1,
        unit_price: 100,
        currency_id: 'ARS',
      }],
      payer: {
        email: 'test@test.com',
      },
      external_reference: 'test-ref-123'
    };
    
    const response = await preference.create({ body: preferenceData });
    
    if (response && response.id) {
      console.log('🎉 ¡TOKEN FUNCIONA PERFECTAMENTE!');
      console.log('Preferencia ID:', response.id);
      console.log('URL de pago:', response.init_point);
    } else {
      console.log('❌ Respuesta inesperada:', response);
    }
    
  } catch (error) {
    console.log('❌ Error con el SDK o token:');
    console.log('Tipo de error:', error.constructor.name);
    console.log('Mensaje:', error.message);
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.log('🔧 El token parece inválido o expirado');
      console.log('💡 Verifica que sea el token correcto de tu cuenta MP');
    }
    
    if (error.message.includes('400')) {
      console.log('🔧 Error en los datos enviados');
    }
  }
}

testTokenDirecto();