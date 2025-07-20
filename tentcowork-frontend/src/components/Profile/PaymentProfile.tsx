import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, DollarSign, X, ArrowRight, Shield, 
  CheckCircle, Clock, AlertCircle, Zap, MapPin
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  days?: string;
  startHour?: string;
  endHour?: string;
}

interface PaymentProfileProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  onMessage: (message: string) => void;
  // Agregamos las funciones que estaban en el primer código
  onPayWithMercadoPago: (plan: Plan) => void;
  onPayWithCash: (plan: Plan) => void;
  // Datos del estudiante necesarios para el pago
  studentData: {
    id: string;
    fullName: string;
    email?: string;
  };
}

// Servicio para conectar con el backend
const createMercadoPagoPayment = async (paymentData: any): Promise<void> => {
  try {
    console.log('🚀 Creando pago con Mercado Pago...', paymentData);
    
    const requestData = {
      paymentData: {
        ...paymentData,
        method: "Mercado Pago Hospedado",
        date: new Date().toISOString(),
        facturado: false
      }
    };
    
    const response = await fetch('http://localhost:4000/api/payments/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error del backend:', errorData);
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Preferencia creada:', data);
    
    // Redirigir a Mercado Pago
    if (data.init_point) {
      console.log('🔄 Redirigiendo a Mercado Pago:', data.init_point);
      window.location.href = data.init_point;
    } else {
      throw new Error('No se recibió URL de pago de Mercado Pago');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    throw new Error(`Error creando pago: ${error.message}`);
  }
};

const PaymentProfile: React.FC<PaymentProfileProps> = ({
  plan,
  isOpen,
  onClose,
  loading,
  onMessage,
  studentData,
  // Agregamos las props que estaban en el primer código
  onPayWithMercadoPago,
  onPayWithCash
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'mercadopago' | 'recepcion' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMethodSelect = (method: 'mercadopago' | 'recepcion') => {
    setSelectedMethod(method);
  };

  const handleConfirmPayment = async () => {
    if (!plan || !selectedMethod || !studentData) {
      onMessage('❌ Faltan datos para procesar el pago');
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedMethod === 'mercadopago') {
        console.log('🚀 Iniciando pago con Mercado Pago...');
        // Usamos la función original que funciona perfectamente
        onPayWithMercadoPago(plan);
        
      } else if (selectedMethod === 'recepcion') {
        console.log('🏢 Registrando pago en recepción...');
        // Usamos la función original del pago en efectivo que funciona
        onPayWithCash(plan);
        onClose();
      }
    } catch (error: any) {
      console.error('❌ Error procesando pago:', error);
      onMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaseDiario = (plan: Plan) => {
    return plan.name.toLowerCase().includes('diario') || 
           plan.name.toLowerCase().includes('pase') || 
           plan.price <= 8000;
  };

  const getPricePeriod = (plan: Plan) => {
    return isPaseDiario(plan) ? 'por día' : 'por mes';
  };

  // Si no hay plan seleccionado, no mostrar nada
  if (!plan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl lg:rounded-3xl max-w-full sm:max-w-md lg:max-w-lg w-full max-h-[95vh] lg:max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 lg:p-6 rounded-t-2xl lg:rounded-t-3xl text-white relative">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
              >
                <X size={16} className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              
              <div className="pr-10 lg:pr-12">
                <h2 className="text-xl lg:text-2xl font-bold mb-1 lg:mb-2">Método de Pago</h2>
                <p className="text-blue-100 text-sm lg:text-base">Elegí cómo querés abonar tu plan</p>
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {/* Resumen del plan seleccionado - DINÁMICO */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 mb-4 lg:mb-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div>
                    <h3 className="text-base lg:text-lg font-bold text-gray-800">{plan.name}</h3>
                    
                    {plan.days && (
                      <p className="text-xs text-blue-600 mt-1">
                        📅 {plan.days} {plan.startHour && plan.endHour && `• ⏰ ${plan.startHour} - ${plan.endHour}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600">
                      ${plan.price.toLocaleString()}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-500">
                      {getPricePeriod(plan)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600">
                  <Shield size={14} className="text-green-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span>Acceso inmediato tras confirmación de pago</span>
                </div>
              </div>

              {/* Métodos de pago */}
              <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
                <h4 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4">
                  Seleccioná tu método de pago preferido:
                </h4>

                {/* Mercado Pago */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMethodSelect('mercadopago')}
                  className={`border-2 rounded-xl lg:rounded-2xl p-4 lg:p-6 cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'mercadopago'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === 'mercadopago'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedMethod === 'mercadopago' && (
                        <CheckCircle size={12} className="text-white w-3 h-3 lg:w-4 lg:h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 lg:space-x-3 mb-2">
                        <div className="w-8 h-6 lg:w-12 lg:h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded flex items-center justify-center">
                          <img 
                            src="/mercadopago.png" // Ruta del logo en la carpeta public
                            alt="Mercado Pago Logo" 
                            className="object-cover w-full h-full" 
                          />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800 text-sm lg:text-base">Mercado Pago</h5>
                          <p className="text-xs lg:text-sm text-gray-600">Pago online seguro</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 lg:gap-3 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Zap size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Pago inmediato</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield size={10} className="text-blue-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>100% seguro</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CreditCard size={10} className="text-purple-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Tarjetas y débito</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Activación automática</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Pago en Recepción */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMethodSelect('recepcion')}
                  className={`border-2 rounded-xl lg:rounded-2xl p-4 lg:p-6 cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'recepcion'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === 'recepcion'
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedMethod === 'recepcion' && (
                        <CheckCircle size={12} className="text-white w-3 h-3 lg:w-4 lg:h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 lg:space-x-3 mb-2">
                        <div className="w-8 h-6 lg:w-12 lg:h-8 bg-gradient-to-r from-green-400 to-green-600 rounded flex items-center justify-center">
                          <MapPin size={14} className="text-white w-3.5 h-3.5 lg:w-5 lg:h-5" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800 text-sm lg:text-base">Pago en Recepción</h5>
                          
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 lg:gap-3 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <DollarSign size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Sin comisiones</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={10} className="text-orange-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Activación manual</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin size={10} className="text-blue-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>En nuestras instalaciones</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span>Efectivo, transferencia o posnet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Información adicional */}
              {selectedMethod === 'recepcion' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-orange-50 border border-orange-200 rounded-xl p-3 lg:p-4 mb-4 lg:mb-6"
                >
                  <div className="flex items-start space-x-2 lg:space-x-3">
                    <MapPin size={14} className="text-orange-500 mt-0.5 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    <div>
                      <h6 className="font-medium text-orange-800 mb-1 text-sm lg:text-base">Pago en Recepción</h6>
                      <p className="text-xs lg:text-sm text-orange-700">
                        Tu solicitud quedará pendiente hasta que realices el pago en nuestras instalaciones. 
                        Un administrador activará tu plan una vez confirmado el pago.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedMethod === 'mercadopago' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-4 mb-4 lg:mb-6"
                >
                  <div className="flex items-start space-x-2 lg:space-x-3">
                    <Zap size={14} className="text-blue-500 mt-0.5 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    <div>
                      <h6 className="font-medium text-blue-800 mb-1 text-sm lg:text-base">Pago con Mercado Pago</h6>
                      <p className="text-xs lg:text-sm text-blue-700">
                        Serás redirigido a la plataforma segura de Mercado Pago. Tu plan se activará 
                        automáticamente una vez confirmado el pago.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Botón de confirmación */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmPayment}
                disabled={!selectedMethod || loading || isProcessing}
                className={`w-full py-3 lg:py-4 rounded-xl font-bold text-base lg:text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 lg:space-x-3 shadow-lg hover:shadow-xl ${
                  selectedMethod === 'mercadopago'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                    : selectedMethod === 'recepcion'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {(loading || isProcessing) ? (
                  <>
                    <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando...</span>
                  </>
                ) : !selectedMethod ? (
                  <span>Seleccioná un método de pago</span>
                ) : selectedMethod === 'mercadopago' ? (
                  <>
                    <CreditCard size={18} className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                    <span>Continuar con Mercado Pago</span>
                    <ArrowRight size={18} className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                  </>
                ) : (
                  <>
                    <DollarSign size={18} className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                    <span>Solicitar Plan (Pago en Recepción)</span>
                    <ArrowRight size={18} className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                  </>
                )}
              </motion.button>

              {/* Footer */}
              <div className="mt-4 lg:mt-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <Shield size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                  <span>Todos los pagos son seguros y están protegidos</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentProfile;