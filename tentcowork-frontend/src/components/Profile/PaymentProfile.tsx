import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, DollarSign, X, ArrowRight, Shield, 
  CheckCircle, Clock, AlertCircle, Zap
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
  onPayWithMercadoPago: (plan: Plan) => void;
  onPayWithCash: (plan: Plan) => void;
  loading: boolean;
}

const PaymentProfile: React.FC<PaymentProfileProps> = ({
  plan,
  isOpen,
  onClose,
  onPayWithMercadoPago,
  onPayWithCash,
  loading
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'mercadopago' | 'efectivo' | null>(null);

  const handleMethodSelect = (method: 'mercadopago' | 'efectivo') => {
    setSelectedMethod(method);
  };

  const handleConfirmPayment = () => {
    if (!plan || !selectedMethod) return;

    if (selectedMethod === 'mercadopago') {
      onPayWithMercadoPago(plan);
    } else {
      onPayWithCash(plan);
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

  if (!plan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-3xl text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
              >
                <X size={20} />
              </button>
              
              <div className="pr-12">
                <h2 className="text-2xl font-bold mb-2">Método de Pago</h2>
                <p className="text-blue-100">Elegí cómo querés abonar tu plan</p>
              </div>
            </div>

            <div className="p-6">
              {/* Resumen del plan */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ${plan.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getPricePeriod(plan)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield size={16} className="text-green-500" />
                  <span>Acceso inmediato tras confirmación de pago</span>
                </div>
              </div>

              {/* Métodos de pago */}
              <div className="space-y-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Seleccioná tu método de pago preferido:
                </h4>

                {/* Mercado Pago */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMethodSelect('mercadopago')}
                  className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'mercadopago'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === 'mercadopago'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedMethod === 'mercadopago' && (
                        <CheckCircle size={16} className="text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded flex items-center justify-center">
                          <img 
                            src="/mercadopago.png" 
                            alt="Mercado Pago" 
                            className="w-full h-full object-cover "
                            onLoad={() => console.log('✅ Imagen MP cargada')}
                            onError={() => console.log('❌ Error cargando imagen MP')}
                            />
                          
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800">Mercado Pago</h5>
                          <p className="text-sm text-gray-600">Pago online seguro</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Zap size={12} className="text-green-500" />
                          <span>Pago inmediato</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield size={12} className="text-blue-500" />
                          <span>100% seguro</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CreditCard size={12} className="text-purple-500" />
                          <span>Tarjetas y débito</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle size={12} className="text-green-500" />
                          <span>Activación automática</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Efectivo */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMethodSelect('efectivo')}
                  className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'efectivo'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === 'efectivo'
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedMethod === 'efectivo' && (
                        <CheckCircle size={16} className="text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded flex items-center justify-center">
                          <DollarSign size={20} className="text-white" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800">Efectivo</h5>
                          <p className="text-sm text-gray-600">Pago en nuestras instalaciones</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <DollarSign size={12} className="text-green-500" />
                          <span>Sin comisiones</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={12} className="text-orange-500" />
                          <span>Activación manual</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <AlertCircle size={12} className="text-blue-500" />
                          <span>Confirmar con admin</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle size={12} className="text-green-500" />
                          <span>Pago directo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Información adicional */}
              {selectedMethod === 'efectivo' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-start space-x-3">
                    <Clock size={16} className="text-orange-500 mt-0.5" />
                    <div>
                      <h6 className="font-medium text-orange-800 mb-1">Pago en efectivo</h6>
                      <p className="text-sm text-orange-700">
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
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-start space-x-3">
                    <Zap size={16} className="text-blue-500 mt-0.5" />
                    <div>
                      <h6 className="font-medium text-blue-800 mb-1">Pago con Mercado Pago</h6>
                      <p className="text-sm text-blue-700">
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
                disabled={!selectedMethod || loading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl ${
                  selectedMethod === 'mercadopago'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                    : selectedMethod === 'efectivo'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando...</span>
                  </>
                ) : !selectedMethod ? (
                  <span>Seleccioná un método de pago</span>
                ) : selectedMethod === 'mercadopago' ? (
                  <>
                    <CreditCard size={20} />
                    <span>Continuar con Mercado Pago</span>
                    <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    <DollarSign size={20} />
                    <span>Solicitar Plan (Pago en Efectivo)</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>

              {/* Footer */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <Shield size={12} className="text-green-500" />
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