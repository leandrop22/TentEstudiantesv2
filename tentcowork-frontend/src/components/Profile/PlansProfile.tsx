import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, CreditCard, Clock, Calendar, ChevronDown, ChevronUp,
  Zap, Trophy, Target, Heart, Users, Sparkles, Crown, Gift,
  CheckCircle, ArrowRight, AlertCircle, Flame, X, ArrowLeft,
  FileText, Shield, Eye, ExternalLink
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  const formatearDescripcion = (descripcion: string) => {
    if (!descripcion) return null;

    const lineas = descripcion.split('\n').filter(linea => linea.trim() !== '');
    
    return (
      <div className="text-xs lg:text-sm text-gray-700 leading-relaxed space-y-2">
        {lineas.map((linea, index) => {
          const lineaTrim = linea.trim();
          
          if (lineaTrim.includes('$') && lineaTrim.includes('/')) {
            return (
              <div key={index} className="font-semibold text-gray-900 text-sm lg:text-base bg-green-50 p-2 rounded-lg border border-green-200">
                {lineaTrim}
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- Horario')) {
            return (
              <div key={index} className="flex items-start space-x-2 lg:space-x-3 bg-blue-50 p-2 lg:p-3 rounded-lg">
                <Clock size={12} className="text-blue-600 mt-0.5 flex-shrink-0 w-3 h-3 lg:w-4 lg:h-4" />
                <span className="font-medium text-blue-800 text-xs lg:text-sm">{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- ')) {
            return (
              <div key={index} className="flex items-start space-x-2 lg:space-x-3 py-1">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mt-1.5 lg:mt-2 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('*')) {
            return (
              <div key={index} className="text-xs text-orange-700 italic bg-orange-50 p-2 lg:p-3 rounded-lg border-l-4 border-orange-300">
                <div className="flex items-start space-x-2">
                  <Sparkles size={10} className="text-orange-500 mt-0.5 flex-shrink-0 w-[14px] h-[14px]" />
                  <span>{lineaTrim}</span>
                </div>
              </div>
            );
          }
          
          if (lineaTrim.endsWith(':')) {
            return (
              <div key={index} className="font-semibold text-gray-900 mt-3 lg:mt-4 mb-1 lg:mb-2 text-sm lg:text-base border-b border-gray-200 pb-1">
                {lineaTrim}
              </div>
            );
          }
          
          return (
            <div key={index} className="mb-1 text-xs lg:text-sm">
              {lineaTrim}
            </div>
          );
        })}
      </div>
    );
  };

  const getBadgeForPlan = (plan: Plan) => {
    // Encontrar el precio más alto para determinar el plan premium
    const maxPrice = Math.max(...planes.map(p => p.price));
    const minPrice = Math.min(...planes.map(p => p.price));
    const priceRange = maxPrice - minPrice;
    
    // Es premium si es el más caro O contiene palabras premium/full
    const isPremium = plan.price === maxPrice || 
                     plan.name.toLowerCase().includes('premium') ||
                     plan.name.toLowerCase().includes('full');
    
    // Es popular si está en el rango medio-alto de precios O es PartTime
    const isPopular = (plan.price > minPrice + (priceRange * 0.3) && plan.price < maxPrice) ||
                     plan.name.toLowerCase().includes('parttime') ||
                     plan.name.toLowerCase().includes('part time') ||
                     plan.name.toLowerCase().includes('estándar') ||
                     plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return (
        <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2 py-0.5 lg:px-3 lg:py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg z-10">
          <Crown size={8} className="w-[10px] h-[10px]" />
          <span>PREMIUM</span>
        </div>
      );
    }
    
    if (isPopular) {
      return (
        <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 lg:px-3 lg:py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg z-10">
          <Flame size={8} className="w-[10px] h-[10px]" />
          <span>POPULAR</span>
        </div>
      );
    }
    
    return null; // Los planes básicos no llevan badge
  };

  const getCardGradient = (plan: Plan) => {
    // Usar la misma lógica dinámica que getBadgeForPlan
    const maxPrice = Math.max(...planes.map(p => p.price));
    const minPrice = Math.min(...planes.map(p => p.price));
    const priceRange = maxPrice - minPrice;
    
    const isPremium = plan.price === maxPrice || 
                     plan.name.toLowerCase().includes('premium') ||
                     plan.name.toLowerCase().includes('full');
    
    const isPopular = (plan.price > minPrice + (priceRange * 0.3) && plan.price < maxPrice) ||
                     plan.name.toLowerCase().includes('parttime') ||
                     plan.name.toLowerCase().includes('part time') ||
                     plan.name.toLowerCase().includes('estándar') ||
                     plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return 'from-purple-50 via-purple-50 to-indigo-50 border-purple-200';
    }
    
    if (isPopular) {
      return 'from-orange-50 via-red-50 to-pink-50 border-orange-200';
    }
    
    // Planes básicos usan el azul por defecto
    return 'from-blue-50 via-blue-50 to-indigo-50 border-blue-200';
  };

  const getButtonGradient = (plan: Plan) => {
    // Usar la misma lógica dinámica que getBadgeForPlan
    const maxPrice = Math.max(...planes.map(p => p.price));
    const minPrice = Math.min(...planes.map(p => p.price));
    const priceRange = maxPrice - minPrice;
    
    const isPremium = plan.price === maxPrice || 
                     plan.name.toLowerCase().includes('premium') ||
                     plan.name.toLowerCase().includes('full');
    
    const isPopular = (plan.price > minPrice + (priceRange * 0.3) && plan.price < maxPrice) ||
                     plan.name.toLowerCase().includes('parttime') ||
                     plan.name.toLowerCase().includes('part time') ||
                     plan.name.toLowerCase().includes('estándar') ||
                     plan.name.toLowerCase().includes('standard');
    
    if (isPremium) {
      return 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
    }
    
    if (isPopular) {
      return 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600';
    }
    
    // Planes básicos usan el azul por defecto
    return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
  };

  const getPlanFeatures = (plan: Plan) => {
    const features = [];
    
    if (plan.startHour && plan.endHour) {
      features.push({
        icon: <Clock size={12} className="text-blue-500 w-3 h-3 lg:w-4 lg:h-4" />,
        text: `${plan.startHour} - ${plan.endHour}`
      });
    }
    
    if (plan.days) {
      features.push({
        icon: <Calendar size={12} className="text-green-500 w-3 h-3 lg:w-4 lg:h-4" />,
        text: plan.days
      });
    }
    
    return features;
  };

  const isPaseDiario = (plan: Plan) => {
    return plan.name.toLowerCase().includes('diario') || 
           plan.name.toLowerCase().includes('pase') || 
           plan.price <= 8000;
  };

  const getPricePeriod = (plan: Plan) => {
    return isPaseDiario(plan) ? 'por día' : 'por mes';
  };

  const handleContratarPlan = (plan: Plan) => {
    if (!termsAccepted) {
      return; // No hacer nada si no se aceptaron los términos
    }
    onSeleccionarMetodoPago(plan);
  };

  // Componente para el Modal de Términos y Condiciones
  const TermsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 lg:p-4 z-[60]"
      onClick={(e) => e.target === e.currentTarget && setShowTermsModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl lg:rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 lg:p-6 text-white relative">
          <button
            onClick={() => setShowTermsModal(false)}
            className="absolute top-3 right-3 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
          >
            <X size={16} className="text-white w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <FileText size={20} className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold">Términos y Condiciones</h2>
              <p className="text-blue-100 text-sm lg:text-base">Planes Estudiantiles Tent Cowork</p>
            </div>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-4 lg:p-6 max-h-[70vh] overflow-y-auto">
          <div className="prose max-w-none text-sm lg:text-base">
            <p className="text-gray-700 mb-4">
              Al adquirir y utilizar cualquiera de los planes estudiantiles ofrecidos por Tent Cowork, 
              el usuario acepta de manera expresa los siguientes términos y condiciones:
            </p>

            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-red-800 mb-2">1. Prioridad de Uso</h3>
                <ul className="text-red-700 space-y-1 text-sm lg:text-base">
                  <li>• La prioridad de utilización de los espacios siempre será de los clientes corporativos del coworking.</li>
                  <li>• El uso de escritorios por parte de estudiantes estará sujeto a disponibilidad.</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-blue-800 mb-2">2. Acceso y Espacios</h3>
                <ul className="text-blue-700 space-y-1 text-sm lg:text-base">
                  <li>• No está permitido el uso de salas de reuniones bajo ningún plan estudiantil.</li>
                  <li>• La permanencia en el espacio común está condicionada a un comportamiento adecuado y respetuoso, sin elevar el tono de voz ni generar molestias a otros usuarios.</li>
                  <li>• En caso de no cumplir con este punto, el personal podrá solicitar amablemente que el estudiante se retire sin reembolso.</li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-green-800 mb-2">3. Servicios</h3>
                <ul className="text-green-700 space-y-1 text-sm lg:text-base">
                  <li>• Los servicios complementarios ofrecidos (café, agua, papel higiénico, climatización, conectividad, etc.) están incluidos según disponibilidad, pero no se garantiza su provisión continua ni se aceptarán reclamos en caso de faltantes momentáneos.</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-yellow-800 mb-2">4. Responsabilidad del Usuario</h3>
                <ul className="text-yellow-700 space-y-1 text-sm lg:text-base">
                  <li>• Cada usuario es responsable de mantener el orden y limpieza del espacio que utilice.</li>
                  <li>• Tent Cowork no se responsabiliza por objetos personales perdidos, olvidados o dañados dentro de las instalaciones.</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-purple-800 mb-2">5. Cancelaciones y Reembolsos</h3>
                <ul className="text-purple-700 space-y-1 text-sm lg:text-base">
                  <li>• No se realizarán reembolsos ni compensaciones por días no utilizados, faltantes de insumos o cierres excepcionales del cowork (por mantenimiento o fuerza mayor).</li>
                </ul>
              </div>

              <div className="bg-indigo-50 border-l-4 border-indigo-400 p-3 lg:p-4 rounded-r-lg">
                <h3 className="font-bold text-indigo-800 mb-2">6. Vigencia y Modificaciones</h3>
                <ul className="text-indigo-700 space-y-1 text-sm lg:text-base">
                  <li>• Tent Cowork se reserva el derecho de modificar los horarios, condiciones y servicios ofrecidos, notificando a los usuarios por los canales oficiales.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="text-gray-600 w-5 h-5" />
                <span className="font-bold text-gray-800">Declaración de Aceptación</span>
              </div>
              <p className="text-gray-700 text-sm lg:text-base">
                Al continuar con el uso del servicio, el estudiante declara haber leído y aceptado estos términos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer del modal */}
        <div className="border-t border-gray-200 p-4 lg:p-6 bg-gray-50">
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setShowTermsModal(false)}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Componente para tarjeta compacta
  const CompactPlanCard = ({ plan, index }: { plan: Plan; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => setSelectedPlan(plan.id)}
      className={`relative bg-gradient-to-br ${getCardGradient(plan)} rounded-xl lg:rounded-2xl border-2 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col`}
    >
      {getBadgeForPlan(plan)}
      
      <div className="p-3 lg:p-6 flex flex-col h-full">
        <div className="text-center mb-3 lg:mb-4">
          <h3 className="text-sm lg:text-lg font-bold text-gray-900 mb-2 lg:mb-3 min-h-[2.5rem] lg:min-h-[3rem] flex items-center justify-center leading-tight">
            {plan.name}
          </h3>
          <div className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            ${plan.price.toLocaleString()}
          </div>
          <div className="text-xs lg:text-sm text-gray-500 font-medium">
            {getPricePeriod(plan)}
          </div>
        </div>

        {/* Features compactas */}
        <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-4 flex-1">
          {getPlanFeatures(plan).map((feature, featureIndex) => (
            <div key={featureIndex} className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm text-gray-600">
              {feature.icon}
              <span className="truncate">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Descripción resumida */}
        {plan.description && (
          <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4 line-clamp-2 min-h-[2rem] lg:min-h-[2.5rem] flex items-start">
            {plan.description.split('\n')[0]?.trim() || plan.description.substring(0, 60) + '...'}
          </p>
        )}

        {/* Botón de ver más */}
        <div className="flex items-center justify-center space-x-1 lg:space-x-2 text-blue-600 group-hover:text-blue-700 transition-colors mt-auto">
          <span className="text-xs lg:text-sm font-medium">Ver detalles</span>
          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform w-3 h-3 lg:w-4 lg:h-4" />
        </div>
      </div>
    </motion.div>
  );

  // Componente para vista detallada
  const DetailedPlanView = ({ plan }: { plan: Plan }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 lg:p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && setSelectedPlan(null)}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        exit={{ y: 50 }}
        className={`relative bg-gradient-to-br ${getCardGradient(plan)} rounded-2xl lg:rounded-3xl border-2 overflow-hidden shadow-2xl max-w-full sm:max-w-xl md:max-w-2xl w-full max-h-[95vh] lg:max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {getBadgeForPlan(plan)}
        
        {/* Botón cerrar */}
        <button
          onClick={() => setSelectedPlan(null)}
          className="absolute top-3 right-3 lg:top-4 lg:right-4 z-20 w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg"
        >
          <X size={16} className="text-gray-600 w-4 h-4 lg:w-5 lg:h-5" />
        </button>

        <div className="p-4 lg:p-8">
          {/* Header del plan */}
          <div className="text-center mb-4 lg:mb-6">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">{plan.name}</h3>
            <div className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1 lg:mb-2">
              ${plan.price.toLocaleString()}
            </div>
            <div className="text-base lg:text-lg text-gray-500 font-medium">
              {getPricePeriod(plan)}
            </div>
          </div>

          {/* Features principales */}
          <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 mb-4 lg:mb-6">
            {[
              ...(plan.startHour && plan.endHour ? [{
                icon: <Clock size={14} className="text-blue-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />,
                text: `Horario: ${plan.startHour} - ${plan.endHour}`
              }] : []),
              ...(plan.days ? [{
                icon: <Calendar size={14} className="text-green-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />,
                text: `Días: ${plan.days}`
              }] : []),
              {
                icon: <Users size={14} className="text-purple-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />,
                text: "Acceso a todas las instalaciones"
              },
              {
                icon: <Target size={14} className="text-orange-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />,
                text: "Asesoramiento personalizado"
              },
              {
                icon: <Heart size={14} className="text-red-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />,
                text: "Comunidad de estudiantes"
              }
            ].map((feature, featureIndex) => (
              <div key={featureIndex} className="flex items-center space-x-2 lg:space-x-3 bg-white bg-opacity-60 rounded-lg p-2 lg:p-3">
                {feature.icon}
                <span className="text-xs lg:text-sm font-medium text-gray-700">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Descripción completa */}
          {plan.description && (
            <div className="mb-4 lg:mb-6">
              <div className={`${expandedDescription === plan.id ? 'hidden' : 'block'}`}>
                <p className="text-gray-700 text-xs lg:text-sm leading-relaxed">
                  {plan.description.split('\n')[0]?.trim() || plan.description.substring(0, 120) + '...'}
                </p>
              </div>
              
              <AnimatePresence>
                {expandedDescription === plan.id && (
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
                  onClick={() => setExpandedDescription(expandedDescription === plan.id ? null : plan.id)}
                  className="flex items-center space-x-1 mt-2 lg:mt-3 text-blue-600 hover:text-blue-700 text-xs lg:text-sm font-medium transition-colors"
                >
                  <span>{expandedDescription === plan.id ? 'Ver menos' : 'Ver detalles completos'}</span>
                  {expandedDescription === plan.id ? (
                    <ChevronUp size={12} className="w-3 h-3 lg:w-4 lg:h-4" />
                  ) : (
                    <ChevronDown size={12} className="w-3 h-3 lg:w-4 lg:h-4" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Call to action */}
          <div className="bg-white bg-opacity-80 rounded-xl p-3 lg:p-4 mb-4 lg:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800 text-sm lg:text-base">¿Listo para comenzar?</div>
                <div className="text-xs lg:text-sm text-gray-600">Acceso inmediato tras la confirmación de pago</div>
              </div>
              <Sparkles className="text-yellow-500 w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>

          {/* Términos y Condiciones */}
          {puedeContratarPlan && (
            <div className="mb-4 lg:mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 lg:p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div 
                    className={`w-4 h-4 lg:w-5 lg:h-5 border-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center ${
                      termsAccepted 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 hover:border-amber-400'
                    }`}
                    onClick={() => setTermsAccepted(!termsAccepted)}
                  >
                    {termsAccepted && (
                      <CheckCircle size={12} className="text-white w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs lg:text-sm">
                    <span className="text-gray-700">Acepto los</span>
                    <button
                      onClick={() => setShowTermsModal(true)}
                      className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 decoration-amber-400 hover:decoration-amber-500 transition-colors inline-flex items-center gap-1"
                    >
                      <FileText size={12} className="w-3 h-3" />
                      Términos y Condiciones
                      <ExternalLink size={10} className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Es obligatorio aceptar los términos para proceder con la contratación
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:gap-3 lg:gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(null)}
              className="flex-1 py-2 lg:py-3 bg-gray-100 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-200 flex items-center justify-center space-x-2 text-sm lg:text-base"
            >
              <ArrowLeft size={14} className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
              <span>Volver</span>
            </motion.button>
            
            <motion.button
              whileHover={termsAccepted && puedeContratarPlan ? { scale: 1.02 } : {}}
              whileTap={termsAccepted && puedeContratarPlan ? { scale: 0.98 } : {}}
              onClick={() => handleContratarPlan(plan)}
              disabled={loading || !puedeContratarPlan || !termsAccepted}
              className={`flex-[2] py-2 lg:py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 lg:space-x-3 shadow-lg text-sm lg:text-base ${
                !termsAccepted && puedeContratarPlan
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : loading || !puedeContratarPlan
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : `bg-gradient-to-r ${getButtonGradient(plan)} text-white hover:shadow-xl`
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : !puedeContratarPlan ? (
                <>
                  <CheckCircle size={14} className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
                  <span>Ya tenés un plan activo</span>
                </>
              ) : !termsAccepted ? (
                <>
                  <AlertCircle size={14} className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
                  <span>Acepta los términos para continuar</span>
                </>
              ) : (
                <>
                  <CreditCard size={14} className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
                  <span>¡Contratar Ahora!</span>
                  <ArrowRight size={14} className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px]" />
                </>
              )}
            </motion.button>
          </div>

          {/* Garantía */}
          {puedeContratarPlan && termsAccepted && (
            <div className="mt-3 lg:mt-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <CheckCircle size={10} className="text-green-500 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                <span>Acceso inmediato • Soporte 24/7 • Instalaciones premium</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl lg:rounded-3xl shadow-2xl overflow-hidden max-w-full sm:max-w-xl md:max-w-7xl mx-auto"
    >
      {/* Header atractivo - Más compacto en móvil */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-4 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 lg:w-40 lg:h-40 opacity-10">
          <Trophy size={96} className="w-24 h-24 lg:w-40 lg:h-40" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-white bg-opacity-20 rounded-xl lg:rounded-2xl flex items-center justify-center">
                <Zap size={20} className="text-white w-5 h-5 lg:w-8 lg:h-8" />
              </div>
              <div>
                <h2 className="text-xl lg:text-3xl font-bold">Planes Disponibles</h2>
                <p className="text-white/80 text-sm lg:text-base">Elige tu plan perfecto</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 px-2 py-1 lg:px-4 lg:py-2 rounded-full">
                <span className="text-sm lg:text-lg font-bold">{planes.length} Opciones</span>
              </div>
            </div>
          </div>

          {/* Call to action principal */}
          <div className="bg-white bg-opacity-10 rounded-xl p-3 lg:p-4 border border-white border-opacity-20">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Gift size={18} className="w-4.5 h-4.5 lg:w-6 lg:h-6" />
              <div>
                <div className="font-bold text-base lg:text-lg">¡Comenzá tu transformación hoy!</div>
                <div className="text-white/80 text-xs lg:text-sm">Haz clic en cualquier plan para ver todos los detalles</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8">
        {/* Mensaje de estado */}
        {!puedeContratarPlan && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4 lg:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl lg:rounded-2xl p-4 lg:p-6"
          >
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-blue-600 w-4 h-4 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-blue-800 text-sm lg:text-lg">¡Ya tenés un plan activo!</h3>
                <p className="text-blue-700 text-xs lg:text-base">Los planes se renuevan automáticamente cada mes desde la fecha de pago.</p>
              </div>
            </div>
          </motion.div>
        )}

        {planes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-6 auto-rows-fr">
            {planes.map((plan, index) => (
              <CompactPlanCard key={plan.id} plan={plan} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 lg:py-12">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
              <AlertCircle size={32} className="text-gray-400 w-8 h-8 lg:w-10 lg:h-10" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-700 mb-2">No hay planes disponibles</h3>
            <p className="text-gray-500 text-sm lg:text-base">Los planes estarán disponibles próximamente</p>
          </div>
        )}

        {/* Footer promocional */}
        {puedeContratarPlan && planes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 lg:mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 border-2 border-green-200"
          >
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 lg:space-x-2 mb-2 lg:mb-3">
                <Trophy className="text-yellow-500 w-4.5 h-4.5 lg:w-6 lg:h-6" />
                <span className="text-base lg:text-lg font-bold text-gray-800">¡Beneficios Exclusivos!</span>
                <Trophy className="text-yellow-500 w-4.5 h-4.5 lg:w-6 lg:h-6" />
              </div>
              <p className="text-gray-700 mb-3 lg:mb-4 text-sm lg:text-base">
                Al contratar cualquier plan obtenés acceso a nuestra comunidad exclusiva de estudiantes, 
                eventos especiales y descuentos en servicios adicionales.
              </p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-center sm:space-y-0 sm:space-x-6 text-xs lg:text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-1">
                  <Users size={12} className="text-blue-500 w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Comunidad activa</span>
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <Sparkles size={12} className="text-purple-500 w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Eventos exclusivos</span>
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <Gift size={12} className="text-green-500 w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Descuentos especiales</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal de vista detallada */}
      <AnimatePresence>
        {selectedPlan && (
          <DetailedPlanView 
            plan={planes.find(p => p.id === selectedPlan)!} 
          />
        )}
      </AnimatePresence>

      {/* Modal de Términos y Condiciones */}
      <AnimatePresence>
        {showTermsModal && <TermsModal />}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlansProfile;