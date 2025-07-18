import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, CreditCard, Clock, Calendar, ChevronDown, ChevronUp,
  Zap, Trophy, Target, Heart, Users, Sparkles, Crown, Gift,
  CheckCircle, ArrowRight, AlertCircle, Flame
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

interface PlansProfileProps {
  planes: Plan[];
  onComprarPlan: (plan: Plan) => void;
  onSeleccionarMetodoPago: (plan: Plan) => void;
  loading: boolean;
  puedeContratarPlan: boolean;
  estudianteConPlan?: boolean;
}

const PlansProfile: React.FC<PlansProfileProps> = ({ 
  planes, 
  onComprarPlan, 
  onSeleccionarMetodoPago,
  loading, 
  puedeContratarPlan,
  estudianteConPlan = false
}) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const formatearDescripcion = (descripcion: string) => {
    if (!descripcion) return null;

    const lineas = descripcion.split('\n').filter(linea => linea.trim() !== '');
    
    return (
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {lineas.map((linea, index) => {
          const lineaTrim = linea.trim();
          
          if (lineaTrim.includes('$') && lineaTrim.includes('/')) {
            return (
              <div key={index} className="font-semibold text-gray-900 text-base bg-green-50 p-2 rounded-lg border border-green-200">
                {lineaTrim}
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- Horario')) {
            return (
              <div key={index} className="flex items-start space-x-3 bg-blue-50 p-3 rounded-lg">
                <Clock size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium text-blue-800">{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- ')) {
            return (
              <div key={index} className="flex items-start space-x-3 py-1">
                <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('*')) {
            return (
              <div key={index} className="text-xs text-orange-700 italic bg-orange-50 p-3 rounded-lg border-l-4 border-orange-300">
                <div className="flex items-start space-x-2">
                  <Sparkles size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>{lineaTrim}</span>
                </div>
              </div>
            );
          }
          
          if (lineaTrim.endsWith(':')) {
            return (
              <div key={index} className="font-semibold text-gray-900 mt-4 mb-2 text-base border-b border-gray-200 pb-1">
                {lineaTrim}
              </div>
            );
          }
          
          return (
            <div key={index} className="mb-1">
              {lineaTrim}
            </div>
          );
        })}
      </div>
    );
  };

  const getBadgeForPlan = (plan: Plan) => {
    const isPremium = plan.name.toLowerCase().includes('premium') || plan.price > 15000;
    const isPopular = plan.name.toLowerCase().includes('estándar') || plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg z-10">
          <Crown size={12} />
          <span>PREMIUM</span>
        </div>
      );
    }
    
    if (isPopular) {
      return (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg z-10">
          <Flame size={12} />
          <span>POPULAR</span>
        </div>
      );
    }
    
    return null;
  };

  const getCardGradient = (plan: Plan) => {
    const isPremium = plan.name.toLowerCase().includes('premium') || plan.price > 15000;
    const isPopular = plan.name.toLowerCase().includes('estándar') || plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return 'from-purple-50 via-purple-50 to-indigo-50 border-purple-200';
    }
    
    if (isPopular) {
      return 'from-orange-50 via-red-50 to-pink-50 border-orange-200';
    }
    
    return 'from-blue-50 via-blue-50 to-indigo-50 border-blue-200';
  };

  const getButtonGradient = (plan: Plan) => {
    const isPremium = plan.name.toLowerCase().includes('premium') || plan.price > 15000;
    const isPopular = plan.name.toLowerCase().includes('estándar') || plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
    }
    
    if (isPopular) {
      return 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600';
    }
    
    return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
  };

  const getPlanFeatures = (plan: Plan) => {
    const features = [];
    
    if (plan.startHour && plan.endHour) {
      features.push({
        icon: <Clock size={16} className="text-blue-500" />,
        text: `Horario: ${plan.startHour} - ${plan.endHour}`
      });
    }
    
    if (plan.days) {
      features.push({
        icon: <Calendar size={16} className="text-green-500" />,
        text: `Días: ${plan.days}`
      });
    }
    
    // Agregar features genéricas para hacer más atractivo
    features.push(
      {
        icon: <Users size={16} className="text-purple-500" />,
        text: "Acceso a todas las instalaciones"
      },
      {
        icon: <Target size={16} className="text-orange-500" />,
        text: "Asesoramiento personalizado"
      },
      {
        icon: <Heart size={16} className="text-red-500" />,
        text: "Comunidad de estudiantes"
      }
    );
    
    return features.slice(0, 5); // Limitamos a 5 features
  };

  const isPaseDiario = (plan: Plan) => {
    return plan.name.toLowerCase().includes('diario') || 
           plan.name.toLowerCase().includes('pase') || 
           plan.price <= 8000; // Asumiendo que precios bajos son pases diarios
  };

  const getPricePeriod = (plan: Plan) => {
    return isPaseDiario(plan) ? 'por día' : 'por mes';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* Header atractivo */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
          <Trophy size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                <Zap size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Planes Disponibles</h2>
                <p className="text-white/80">Elige tu plan perfecto</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <span className="text-lg font-bold">{planes.length} Opciones</span>
              </div>
            </div>
          </div>

          {/* Call to action principal */}
          <div className="bg-white bg-opacity-10 rounded-xl p-4 border border-white border-opacity-20">
            <div className="flex items-center space-x-3">
              <Gift size={24} />
              <div>
                <div className="font-bold text-lg">¡Comenzá tu transformación hoy!</div>
                <div className="text-white/80 text-sm">Acceso inmediato a todas nuestras instalaciones</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Mensaje de estado */}
        {!puedeContratarPlan && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-blue-800 text-lg">¡Ya tenés un plan activo!</h3>
                <p className="text-blue-700">Los planes se renuevan automáticamente cada mes desde la fecha de pago.</p>
              </div>
            </div>
          </motion.div>
        )}

        {planes.length > 0 ? (
          <div className="space-y-6">
            {planes.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={`relative bg-gradient-to-br ${getCardGradient(plan)} rounded-2xl border-2 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}
              >
                {/* Badge */}
                {getBadgeForPlan(plan)}

                <div className="p-8">
                  {/* Header del plan */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Zap className="text-orange-500" size={20} />
                        <span className="text-gray-600">Acceso completo</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        ${plan.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {getPricePeriod(plan)}
                      </div>
                    </div>
                  </div>

                  {/* Features del plan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {getPlanFeatures(plan).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3 bg-white bg-opacity-60 rounded-lg p-3">
                        {feature.icon}
                        <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Descripción expandible */}
                  {plan.description && (
                    <div className="mb-6">
                      <div className={`${expandedPlan === plan.id ? 'hidden' : 'block'}`}>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {plan.description.split('\n')[0]?.trim() || plan.description.substring(0, 120) + '...'}
                        </p>
                      </div>
                      
                      <AnimatePresence>
                        {expandedPlan === plan.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            {formatearDescripcion(plan.description)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {plan.description.length > 120 && (
                        <button
                          onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                          className="flex items-center space-x-1 mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                        >
                          <span>{expandedPlan === plan.id ? 'Ver menos' : 'Ver detalles completos'}</span>
                          {expandedPlan === plan.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Call to action */}
                  <div className="bg-white bg-opacity-80 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800">¿Listo para comenzar?</div>
                        <div className="text-sm text-gray-600">Acceso inmediato tras la confirmación de pago</div>
                      </div>
                      <Sparkles className="text-yellow-500" size={24} />
                    </div>
                  </div>

                  {/* Botón de compra */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSeleccionarMetodoPago(plan)}
                    disabled={loading || !puedeContratarPlan}
                    className={`w-full py-4 bg-gradient-to-r ${getButtonGradient(plan)} text-white rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl`}
                  >
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Procesando...</span>
                      </>
                    ) : !puedeContratarPlan ? (
                      <>
                        <CheckCircle size={20} />
                        <span>Ya tenés un plan activo</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} />
                        <span>¡Contratar Ahora!</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </motion.button>

                  {/* Garantía */}
                  {puedeContratarPlan && (
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                        <CheckCircle size={12} className="text-green-500" />
                        <span>Acceso inmediato • Soporte 24/7 • Instalaciones premium</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No hay planes disponibles</h3>
            <p className="text-gray-500">Los planes estarán disponibles próximamente</p>
          </div>
        )}

        {/* Footer promocional */}
        {puedeContratarPlan && planes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200"
          >
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Trophy className="text-yellow-500" size={24} />
                <span className="text-lg font-bold text-gray-800">¡Beneficios Exclusivos!</span>
                <Trophy className="text-yellow-500" size={24} />
              </div>
              <p className="text-gray-700 mb-4">
                Al contratar cualquier plan obtenés acceso a nuestra comunidad exclusiva de estudiantes, 
                eventos especiales y descuentos en servicios adicionales.
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Users size={16} className="text-blue-500" />
                  <span>Comunidad activa</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Sparkles size={16} className="text-purple-500" />
                  <span>Eventos exclusivos</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Gift size={16} className="text-green-500" />
                  <span>Descuentos especiales</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PlansProfile;