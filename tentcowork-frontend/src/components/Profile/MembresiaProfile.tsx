import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Calendar,
  CreditCard, Star, Clock, Timer, AlertTriangle, Crown, Zap
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  days?: string;
  startHour?: string;
  endHour?: string;
}

interface Membresia {
  nombre: string;
  estado: 'activa' | 'pendiente' | 'cancelada' | 'vencido';
  montoPagado: number;
  medioPago: string;
  fechaDesde?: Timestamp;
  fechaHasta?: Timestamp;
}

interface Estudiante {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string;
  plan?: string;
  membresia?: Membresia;
}

interface MembresiaProfileProps {
  estudiante: Estudiante;
  planes: Plan[];
}

const MembresiaProfile: React.FC<MembresiaProfileProps> = ({ estudiante, planes }) => {
  // Función para verificar validez usando fechaDesde y fechaHasta como Timestamp
  const verificarValidez = (fechaDesde?: Timestamp, fechaHasta?: Timestamp) => {
    if (!fechaDesde || !fechaHasta) return false;
    
    const hoy = new Date();
    const desde = fechaDesde.toDate();
    const hasta = fechaHasta.toDate();
    
    return hoy >= desde && hoy <= hasta;
  };

  // Función para obtener días restantes usando fechaHasta como Timestamp
  const getDiasRestantes = (fechaHasta?: Timestamp) => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  };

  // Función para obtener el estado real de la membresía
  const getEstadoReal = (membresia: any) => {
    if (!membresia) return 'sin_plan';
    
    // Verificar si hay fechas de vigencia
    if (membresia.fechaDesde && membresia.fechaHasta) {
      const esValido = verificarValidez(membresia.fechaDesde, membresia.fechaHasta);
      if (!esValido) {
        const diasRestantes = getDiasRestantes(membresia.fechaHasta);
        return diasRestantes < 0 ? 'vencido' : 'por_vencer';
      }
      
      const diasRestantes = getDiasRestantes(membresia.fechaHasta);
      if (diasRestantes <= 7 && diasRestantes > 0) return 'por_vencer';
      
      return 'activa';
    }
    
    // Si no hay fechas de vigencia, usar el estado original
    return membresia.estado || 'sin_plan';
  };

  const getEstudiantePlan = () => {
    if (!estudiante || !estudiante.plan) return null;
    return planes.find(plan => plan.name === estudiante.plan);
  };

  const formatearHorario = (planCompleto: Plan | null) => {
    if (!planCompleto || !planCompleto.startHour || !planCompleto.endHour) {
      return 'Horario no especificado';
    }
    return `${planCompleto.startHour} - ${planCompleto.endHour}`;
  };

  const getEstadoColor = (estadoReal: string) => {
    switch (estadoReal) {
      case 'activa': return 'from-green-500 to-green-600';
      case 'pendiente': return 'from-yellow-500 to-yellow-600';
      case 'por_vencer': return 'from-orange-500 to-orange-600';
      case 'vencido': return 'from-red-500 to-red-600';
      case 'cancelada': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getEstadoBgColor = (estadoReal: string) => {
    switch (estadoReal) {
      case 'activa': return 'from-green-50 to-green-100 border-green-200';
      case 'pendiente': return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 'por_vencer': return 'from-orange-50 to-orange-100 border-orange-200';
      case 'vencido': return 'from-red-50 to-red-100 border-red-200';
      case 'cancelada': return 'from-gray-50 to-gray-100 border-gray-200';
      default: return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getEstadoIcon = (estadoReal: string) => {
    switch (estadoReal) {
      case 'activa': return <Crown size={24} className="text-green-600" />;
      case 'pendiente': return <AlertCircle size={24} className="text-yellow-600" />;
      case 'por_vencer': return <Timer size={24} className="text-orange-600" />;
      case 'vencido': return <XCircle size={24} className="text-red-600" />;
      case 'cancelada': return <XCircle size={24} className="text-gray-600" />;
      default: return <AlertCircle size={24} className="text-gray-600" />;
    }
  };

  const getEstadoTexto = (estadoReal: string, diasRestantes?: number) => {
    switch (estadoReal) {
      case 'activa': return 'Plan Activo';
      case 'pendiente': return 'Pendiente de Pago';
      case 'por_vencer': return `Expira en ${diasRestantes} días`;
      case 'vencido': return 'Plan Vencido';
      case 'cancelada': return 'Plan Cancelado';
      default: return 'Sin Plan Activo';
    }
  };

  const getProgressPercentage = (fechaDesde?: Timestamp, fechaHasta?: Timestamp) => {
    if (!fechaDesde || !fechaHasta) return 0;
    
    const inicio = fechaDesde.toDate().getTime();
    const fin = fechaHasta.toDate().getTime();
    const ahora = new Date().getTime();
    
    if (ahora < inicio) return 0;
    if (ahora > fin) return 100;
    
    const progreso = ((ahora - inicio) / (fin - inicio)) * 100;
    return Math.max(0, Math.min(100, progreso));
  };

  const planCompleto = getEstudiantePlan();
  const estadoReal = estudiante?.membresia ? getEstadoReal(estudiante.membresia) : 'sin_plan';
  const diasRestantes = estudiante?.membresia ? getDiasRestantes(estudiante.membresia.fechaHasta) : 0;
  const porcentajeProgreso = estudiante?.membresia ? getProgressPercentage(estudiante.membresia.fechaDesde, estudiante.membresia.fechaHasta) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* Header con gradiente dinámico */}
      <div className={`bg-gradient-to-r ${getEstadoColor(estadoReal)} p-8 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Shield size={128} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                {getEstadoIcon(estadoReal)}
              </div>
              <div>
                <h2 className="text-3xl font-bold">Mi Membresía</h2>
                <p className="text-white/80">Estado de tu plan</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium opacity-90">Estado</div>
              <div className="text-2xl font-bold">{getEstadoTexto(estadoReal, diasRestantes)}</div>
            </div>
          </div>

          {/* Barra de progreso para planes activos */}
          {estadoReal === 'activa' && estudiante?.membresia?.fechaDesde && estudiante?.membresia?.fechaHasta && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso del periodo</span>
                <span>{Math.round(porcentajeProgreso)}%</span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeProgreso}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-white h-2 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        {estudiante?.membresia && estudiante.plan ? (
          <div className="space-y-6">
            {/* Información principal del plan */}
            <div className={`bg-gradient-to-br ${getEstadoBgColor(estadoReal)} rounded-2xl p-6 border-2`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Star className="text-yellow-500" size={24} />
                  <span className="text-xl font-bold text-gray-800">{estudiante.membresia.nombre}</span>
                </div>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full">
                  <Zap size={16} className="text-orange-500" />
                  <span className="font-bold text-gray-800">
                    ${planCompleto?.price ? planCompleto.price.toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
              
              {/* Alerta de vencimiento */}
              {(estadoReal === 'por_vencer' || estadoReal === 'vencido') && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`mb-4 p-4 rounded-xl border-2 ${
                    estadoReal === 'vencido' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle size={20} className={estadoReal === 'vencido' ? 'text-red-600' : 'text-orange-600'} />
                    <div>
                      <div className={`font-bold ${
                        estadoReal === 'vencido' ? 'text-red-800' : 'text-orange-800'
                      }`}>
                        {estadoReal === 'vencido' ? '¡Plan Vencido!' : '¡Plan por Vencer!'}
                      </div>
                      <div className={`text-sm ${
                        estadoReal === 'vencido' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        {estadoReal === 'vencido' 
                          ? 'Tu plan ha vencido. Renuévalo para seguir disfrutando del acceso.'
                          : `Tu plan vence el ${estudiante.membresia.fechaHasta ? estudiante.membresia.fechaHasta.toDate().toLocaleDateString() : 'fecha no especificada'}.`
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Información de fechas y estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {estudiante.membresia.fechaDesde && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className="text-green-500" />
                      <span className="text-sm font-medium text-gray-600">Fecha de Inicio</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {estudiante.membresia.fechaDesde.toDate().toLocaleDateString()}
                    </div>
                  </div>
                )}

                {estudiante.membresia.fechaHasta && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className={diasRestantes <= 7 && diasRestantes > 0 ? 'text-orange-500' : 'text-blue-500'} />
                      <span className="text-sm font-medium text-gray-600">Fecha de Vencimiento</span>
                    </div>
                    <div className={`text-lg font-bold ${diasRestantes <= 7 && diasRestantes > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                      {estudiante.membresia.fechaHasta.toDate().toLocaleDateString()}
                    </div>
                    {diasRestantes > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {diasRestantes} días restantes
                      </div>
                    )}
                  </div>
                )}

                {planCompleto && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock size={16} className="text-purple-500" />
                      <span className="text-sm font-medium text-gray-600">Horarios</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatearHorario(planCompleto)}
                    </div>
                  </div>
                )}

                {planCompleto?.days && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className="text-indigo-500" />
                      <span className="text-sm font-medium text-gray-600">Días Disponibles</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {planCompleto.days}
                    </div>
                  </div>
                )}

                {estudiante.membresia.montoPagado > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard size={16} className="text-green-500" />
                      <span className="text-sm font-medium text-gray-600">Monto Pagado</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${estudiante.membresia.montoPagado.toLocaleString()}
                    </div>
                  </div>
                )}

                {estudiante.membresia.medioPago && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-600">Método de Pago</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {estudiante.membresia.medioPago}
                    </div>
                  </div>
                )}
              </div>

              {/* Información adicional */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Timer size={16} />
                  <span className="italic">
                    {estudiante.membresia.fechaDesde && estudiante.membresia.fechaHasta
                      ? 'Vigencia: 1 mes desde la fecha de pago confirmado'
                      : 'Vigencia: se activará con el pago confirmado'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Plan Premium Badge */}
            {estadoReal === 'activa' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center"
              >
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <Crown size={24} className="text-yellow-800" />
                  <span className="text-xl font-bold text-yellow-800">¡Miembro Premium!</span>
                  <Crown size={24} className="text-yellow-800" />
                </div>
                <p className="text-yellow-700">Disfrutás de acceso completo a todas las instalaciones</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={40} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Sin Membresía Activa</h3>
            <p className="text-gray-500 mb-6">No tenés una membresía activa en este momento</p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <p className="text-blue-700 font-medium">
                ¡Explorá nuestros planes disponibles y comenzá tu experiencia premium!
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MembresiaProfile;