import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Calendar,
  CreditCard, Star, Clock, Timer, AlertTriangle, Crown, Zap,
  UserX, Mail, Phone, Sun, CalendarDays, Plus
} from 'lucide-react';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

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
  motivoCancelacion?: string;
  fechaCancelacion?: Timestamp;
}

interface Estudiante {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string | null;
  plan?: string;
  membresia?: Membresia;
  role?: string;
  isCheckedIn?: boolean;
  lastCheckInTimestamp?: Timestamp;
  activo?: boolean;
}

interface MembresiaProfileProps {
  estudiante: Estudiante;
  planes: Plan[];
  onMembresiaUpdate?: () => void;
  onMessage: (message: string) => void;
}

const MembresiaProfile: React.FC<MembresiaProfileProps> = ({ 
  estudiante, 
  planes, 
  onMembresiaUpdate,
  onMessage
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ✅ NUEVA FUNCIÓN: Detectar si es pase diario
  const isPaseDiario = (planName: string, price: number = 0) => {
    const nombre = planName.toLowerCase();
    return nombre.includes('diario') || 
           nombre.includes('día') || 
           nombre.includes('day') ||
           (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
           price <= 8000;
  };

  // ✅ CORREGIDA: Obtener horas restantes sin valores negativos
  const getHorasRestantes = (fechaHasta?: Timestamp): number => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    
    // Si ya venció, retornar 0 en lugar de negativo
    if (diferencia <= 0) return 0;
    
    return Math.ceil(diferencia / (1000 * 3600)); // Horas
  };

  // ✅ CORREGIDA: Obtener minutos restantes sin valores negativos
  const getMinutosRestantes = (fechaHasta?: Timestamp): number => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    
    // Si ya venció, retornar 0 en lugar de negativo
    if (diferencia <= 0) return 0;
    
    return Math.ceil(diferencia / (1000 * 60)); // Minutos
  };

  // Función para solicitar baja de membresía
  const handleCancelMembership = async () => {
    if (!cancelReason.trim()) {
      onMessage('Por favor, proporciona un motivo para la baja');
      return;
    }

    setIsProcessing(true);
    try {
      const studentRef = doc(db, 'students', estudiante.uid);
      
      const updateData = {
        'membresia.estado': 'cancelada',
        activo: false,
        'membresia.motivoCancelacion': cancelReason,
        'membresia.fechaCancelacion': Timestamp.now()
      };

      await updateDoc(studentRef, updateData);
      
      setShowCancelModal(false);
      setCancelReason('');
      
      if (onMembresiaUpdate) {
        onMembresiaUpdate();
      }
      
      onMessage('✅ Solicitud de baja enviada exitosamente. Un administrador revisará tu solicitud.');
      
    } catch (error: any) {
      console.error('❌ Error al cancelar membresía:', error);
      onMessage('Error al procesar la solicitud: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para enviar notificación al admin
  const sendCancelNotificationToAdmin = async (estudiante: Estudiante, motivo: string) => {
    try {
      const notificationData = {
        tipo: 'cancelacion_membresia',
        estudiante: {
          uid: estudiante.uid,
          nombre: estudiante.fullName,
          email: estudiante.email,
          plan: estudiante.plan || 'N/A'
        },
        motivo: motivo,
        fecha: Timestamp.now(),
        estado: 'pendiente'
      };
    } catch (error) {
      console.error('Error al enviar notificación al admin:', error);
    }
  };

  // Buscar plan correspondiente al estudiante
  const getEstudiantePlan = (): Plan | null => {
    if (!estudiante?.plan || !planes?.length) return null;
    
    const planEncontrado = planes.find(plan => plan.name === estudiante.plan);
    return planEncontrado || null;
  };

  // Obtener precio del plan
  const getPlanPrice = (): number => {
    const plan = getEstudiantePlan();
    return plan?.price || 0;
  };

  // Obtener nombre del plan
  const getPlanName = (): string => {
    return estudiante?.membresia?.nombre || estudiante?.plan || 'Plan no encontrado';
  };

  // Verificar si la membresía está vigente
  const verificarValidez = (fechaDesde?: Timestamp, fechaHasta?: Timestamp): boolean => {
    if (!fechaDesde || !fechaHasta) return false;
    
    const hoy = new Date();
    const desde = fechaDesde.toDate();
    const hasta = fechaHasta.toDate();
    
    return hoy >= desde && hoy <= hasta;
  };

  // ✅ MEJORADA: Obtener días restantes (o horas para pases diarios)
  const getDiasRestantes = (fechaHasta?: Timestamp): number => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  };

  // ✅ NUEVA FUNCIÓN: Resetear membresía completamente
  const handleResetMembership = async () => {
    if (!estudiante) return;
    
    setIsProcessing(true);
    try {
      console.log('=== RESETEANDO MEMBRESÍA ===');
      console.log('Student ID:', estudiante.uid);
      
      const studentRef = doc(db, 'students', estudiante.uid);
      
      // Limpiar completamente la membresía
      const updateData = {
        plan: '',
        'membresia.nombre': '',
        'membresia.estado': '',
        'membresia.montoPagado': 0,
        'membresia.medioPago': '',
        'membresia.fechaDesde': null,
        'membresia.fechaHasta': null,
        'membresia.motivoCancelacion': null,
        'membresia.fechaCancelacion': null,
        activo: false
      };
      
      await updateDoc(studentRef, updateData);
      console.log('✅ Membresía reseteada exitosamente');
      
      // Notificar al usuario
      onMessage('✅ Membresía reseteada. Ya puedes contratar un nuevo plan.');
      
      // Actualizar el componente padre
      if (onMembresiaUpdate) {
        setTimeout(() => {
          onMembresiaUpdate();
        }, 1500);
      }
      
    } catch (error: any) {
      console.error('❌ Error al resetear membresía:', error);
      onMessage('❌ Error al resetear membresía: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FUNCIÓN REMOVIDA: Eliminamos la limpieza automática problemática
  // const limpiarMembresiaVencida = async (estudiante: Estudiante) => {
  //   // REMOVIDA - Causaba bucles infinitos
  // };

  // ✅ MEJORADA: Obtener estado real SIN limpieza automática
  const getEstadoReal = (membresia?: Membresia): string => {
    if (!membresia) return 'sin_plan';
    
    if (membresia.estado === 'cancelada') return 'cancelada';
    if (membresia.estado === 'pendiente') return 'pendiente';
    
    // Verificar vigencia por fechas
    if (membresia.fechaDesde && membresia.fechaHasta) {
      const ahora = new Date();
      const fechaVencimiento = membresia.fechaHasta.toDate();
      
      // ✅ CORREGIDO: Solo verificar, NO limpiar automáticamente
      if (ahora > fechaVencimiento) {
        return 'vencido';
      }
      
      const esValido = verificarValidez(membresia.fechaDesde, membresia.fechaHasta);
      
      if (!esValido) {
        const diasRestantes = getDiasRestantes(membresia.fechaHasta);
        return diasRestantes < 0 ? 'vencido' : 'por_vencer';
      }
      
      // Lógica específica para pases diarios
      const planPrice = getPlanPrice();
      const planName = getPlanName();
      const esDiario = isPaseDiario(planName, planPrice);
      
      if (esDiario) {
        // Para pases diarios, verificar horas restantes
        const horasRestantes = getHorasRestantes(membresia.fechaHasta);
        if (horasRestantes <= 2 && horasRestantes > 0) return 'por_vencer';
      } else {
        // Para planes mensuales, verificar días restantes
        const diasRestantes = getDiasRestantes(membresia.fechaHasta);
        if (diasRestantes <= 7 && diasRestantes > 0) return 'por_vencer';
      }
      
      return 'activa';
    }
    
    return membresia.estado || 'sin_plan';
  };

  // Formatear horario del plan
  const formatearHorario = (plan: Plan | null): string => {
    if (!plan?.startHour || !plan?.endHour) {
      return 'Horario no especificado';
    }
    return `${plan.startHour} - ${plan.endHour}`;
  };

  // Formatear días del plan
  const formatearDias = (plan: Plan | null): string => {
    if (!plan?.days) return 'Días no especificados';
    
    if (plan.days.includes(',') || plan.days.length <= 10) {
      return plan.days;
    }
    
    return plan.days;
  };

  // Obtener color del gradiente según estado
  const getEstadoColor = (estadoReal: string): string => {
    switch (estadoReal) {
      case 'activa': return 'from-green-500 to-green-600';
      case 'pendiente': return 'from-yellow-500 to-yellow-600';
      case 'por_vencer': return 'from-orange-500 to-orange-600';
      case 'vencido': return 'from-red-500 to-red-600';
      case 'cancelada': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  // Obtener color de fondo según estado
  const getEstadoBgColor = (estadoReal: string): string => {
    switch (estadoReal) {
      case 'activa': return 'from-green-50 to-green-100 border-green-200';
      case 'pendiente': return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 'por_vencer': return 'from-orange-50 to-orange-100 border-orange-200';
      case 'vencido': return 'from-red-50 to-red-100 border-red-200';
      case 'cancelada': return 'from-gray-50 to-gray-100 border-gray-200';
      default: return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  // Obtener ícono según estado
  const getEstadoIcon = (estadoReal: string): JSX.Element => {
    switch (estadoReal) {
      case 'activa': return <Crown size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
      case 'pendiente': return <AlertCircle size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
      case 'por_vencer': return <Timer size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
      case 'vencido': return <XCircle size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
      case 'cancelada': return <XCircle size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
      default: return <AlertCircle size={20} className="text-white w-5 h-5 lg:w-6 lg:h-6" />;
    }
  };

  // ✅ CORREGIDA: Obtener texto del estado sin valores negativos
  const getEstadoTexto = (estadoReal: string, diasRestantes?: number, horasRestantes?: number, esDiario?: boolean): string => {
    switch (estadoReal) {
      case 'activa': return 'Plan Activo';
      case 'pendiente': return 'Pendiente de Pago';
      case 'por_vencer': 
        if (esDiario && horasRestantes !== undefined) {
          if (horasRestantes <= 0) return 'Plan Vencido';
          if (horasRestantes <= 1) {
            const minutosRestantes = getMinutosRestantes(estudiante?.membresia?.fechaHasta);
            return minutosRestantes > 0 ? `Expira en ${minutosRestantes} min` : 'Plan Vencido';
          }
          return `Expira en ${horasRestantes}h`;
        }
        return diasRestantes && diasRestantes > 0 ? `Expira en ${diasRestantes} días` : 'Plan Vencido';
      case 'vencido': return 'Plan Vencido';
      case 'cancelada': return 'Plan Cancelado';
      default: return 'Sin Plan Activo';
    }
  };

  // ✅ MEJORADA: Obtener porcentaje de progreso considerando pases diarios
  const getProgressPercentage = (fechaDesde?: Timestamp, fechaHasta?: Timestamp): number => {
    if (!fechaDesde || !fechaHasta) return 0;
    
    const inicio = fechaDesde.toDate().getTime();
    const fin = fechaHasta.toDate().getTime();
    const ahora = new Date().getTime();
    
    if (ahora < inicio) return 0;
    if (ahora > fin) return 100;
    
    const progreso = ((ahora - inicio) / (fin - inicio)) * 100;
    return Math.max(0, Math.min(100, progreso));
  };

  // ✅ CORREGIDA: Formatear tiempo restante sin valores negativos
  const formatearTiempoRestante = (fechaHasta?: Timestamp, esDiario: boolean = false): string => {
    if (!fechaHasta) return '';
    
    const ahora = new Date();
    const hasta = fechaHasta.toDate();
    
    // Si ya venció, mostrar "Vencido"
    if (ahora > hasta) {
      return 'Vencido';
    }
    
    if (esDiario) {
      const horasRestantes = getHorasRestantes(fechaHasta);
      if (horasRestantes <= 1) {
        const minutosRestantes = getMinutosRestantes(fechaHasta);
        return minutosRestantes > 0 ? `${minutosRestantes} minutos restantes` : 'Vencido';
      }
      return horasRestantes > 0 ? `${horasRestantes} horas restantes` : 'Vencido';
    } else {
      const diasRestantes = getDiasRestantes(fechaHasta);
      return diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Vencido';
    }
  };

  // Variables principales
  const planCompleto = getEstudiantePlan();
  const planPrice = getPlanPrice();
  const planName = getPlanName();
  const esDiario = isPaseDiario(planName, planPrice);
  const estadoReal = getEstadoReal(estudiante?.membresia);
  const diasRestantes = getDiasRestantes(estudiante?.membresia?.fechaHasta);
  const horasRestantes = getHorasRestantes(estudiante?.membresia?.fechaHasta);
  const porcentajeProgreso = getProgressPercentage(
    estudiante?.membresia?.fechaDesde, 
    estudiante?.membresia?.fechaHasta
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl lg:rounded-3xl shadow-2xl overflow-hidden w-full"
    >
      {/* Header con gradiente dinámico */}
      <div className={`bg-gradient-to-r ${getEstadoColor(estadoReal)} p-4 lg:p-8 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-20 h-20 lg:w-32 lg:h-32 opacity-10">
          <Shield size={80} className="w-20 h-20 lg:w-32 lg:h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-white bg-opacity-20 rounded-xl lg:rounded-2xl flex items-center justify-center">
                {getEstadoIcon(estadoReal)}
              </div>
              <div>
                <h2 className="text-xl lg:text-3xl font-bold">Mi Membresía</h2>
                <p className="text-white/80 text-sm lg:text-base">Estado de tu plan</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm lg:text-lg font-medium opacity-90">Estado</div>
              <div className="text-lg lg:text-2xl font-bold">
                {getEstadoTexto(estadoReal, diasRestantes, horasRestantes, esDiario)}
              </div>
            </div>
          </div>

          {/* Barra de progreso para planes activos */}
          {estadoReal === 'activa' && estudiante?.membresia?.fechaDesde && estudiante?.membresia?.fechaHasta && (
            <div className="mt-4 lg:mt-6">
              <div className="flex justify-between text-xs lg:text-sm mb-2">
                <span>Progreso del periodo</span>
                <span>{Math.round(porcentajeProgreso)}%</span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5 lg:h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeProgreso}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-white h-1.5 lg:h-2 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-8">
        {estudiante?.membresia ? (
          <div className="space-y-4 lg:space-y-6">
            {/* Información principal del plan */}
            <div className={`bg-gradient-to-br ${getEstadoBgColor(estadoReal)} rounded-xl lg:rounded-2xl p-4 lg:p-6 border-2`}>
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <Star className="text-yellow-500 w-5 h-5 lg:w-6 lg:h-6" />
                  <div className="flex items-center space-x-2">
                    <span className="text-lg lg:text-xl font-bold text-gray-800">
                      {planName}
                    </span>
                    {/* ✅ NUEVO: Badge de tipo de plan */}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      esDiario
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {esDiario ? <Sun size={12} className="inline mr-1" /> : <CalendarDays size={12} className="inline mr-1" />}
                      {esDiario ? 'Diario' : 'Mensual'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 lg:space-x-2 bg-white px-2 lg:px-4 py-1 lg:py-2 rounded-full shadow-sm">
                  <Zap size={14} className="text-orange-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="font-bold text-gray-800 text-sm lg:text-base">
                    ${estudiante.membresia.montoPagado > 0 ? estudiante.membresia.montoPagado.toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
              
              {/* ✅ MEJORADA: Alerta de vencimiento con lógica específica para pases diarios */}
              {(estadoReal === 'por_vencer' || estadoReal === 'vencido') && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`mb-3 lg:mb-4 p-3 lg:p-4 rounded-xl border-2 ${
                    estadoReal === 'vencido' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <AlertTriangle size={18} className={`w-4.5 h-4.5 lg:w-5 lg:h-5 ${estadoReal === 'vencido' ? 'text-red-600' : 'text-orange-600'}`} />
                    <div>
                      <div className={`font-bold text-sm lg:text-base ${
                        estadoReal === 'vencido' ? 'text-red-800' : 'text-orange-800'
                      }`}>
                        {estadoReal === 'vencido' ? '¡Plan Vencido!' : `¡Plan por Vencer!`}
                      </div>
                      <div className={`text-xs lg:text-sm ${
                        estadoReal === 'vencido' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        {estadoReal === 'vencido' 
                          ? `Tu ${esDiario ? 'pase diario' : 'plan'} ha vencido. ${esDiario ? 'Obtén un nuevo pase para acceder hoy.' : 'Renuévalo para seguir disfrutando del acceso.'}`
                          : esDiario 
                            ? `Tu pase vence ${formatearTiempoRestante(estudiante.membresia.fechaHasta, true)}.`
                            : `Tu plan vence el ${estudiante.membresia.fechaHasta?.toDate().toLocaleDateString()}.`
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Grid de información */}
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 lg:space-y-0">
                {/* Fecha de Inicio */}
                {estudiante.membresia.fechaDesde && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <Calendar size={14} className="text-green-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">
                        {esDiario ? 'Inicio del Pase' : 'Fecha de Inicio'}
                      </span>
                    </div>
                    <div className="text-sm lg:text-lg font-bold text-gray-800">
                      {esDiario 
                        ? estudiante.membresia.fechaDesde.toDate().toLocaleDateString()
                        : estudiante.membresia.fechaDesde.toDate().toLocaleDateString()
                      }
                    </div>
                  </div>
                )}

                {/* Fecha de Vencimiento */}
                {estudiante.membresia.fechaHasta && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <Calendar size={14} className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${
                        (esDiario && horasRestantes <= 2) || (!esDiario && diasRestantes <= 7) && diasRestantes > 0 
                          ? 'text-orange-500' 
                          : 'text-blue-500'
                      }`} />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">
                        {esDiario ? 'Vence a las' : 'Fecha de Vencimiento'}
                      </span>
                    </div>
                    <div className={`text-sm lg:text-lg font-bold ${
                      (esDiario && horasRestantes <= 2) || (!esDiario && diasRestantes <= 7) && diasRestantes > 0 
                        ? 'text-orange-600' 
                        : 'text-gray-800'
                    }`}>
                      {esDiario 
                        ? '23:59 de hoy'
                        : estudiante.membresia.fechaHasta.toDate().toLocaleDateString()
                      }
                    </div>
                    {/* ✅ MEJORADO: Tiempo restante específico */}
                    <div className="text-xs text-gray-500 mt-1">
                      {formatearTiempoRestante(estudiante.membresia.fechaHasta, esDiario)}
                    </div>
                  </div>
                )}

                {/* Horarios */}
                {planCompleto && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <Clock size={14} className="text-purple-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">Horarios</span>
                    </div>
                    <div className="text-sm lg:text-lg font-bold text-gray-800">
                      {formatearHorario(planCompleto)}
                    </div>
                  </div>
                )}

                {/* Días Disponibles - Solo para planes no diarios */}
                {planCompleto?.days && !esDiario && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <Calendar size={14} className="text-indigo-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">Días Disponibles</span>
                    </div>
                    <div className="text-sm lg:text-lg font-bold text-gray-800">
                      {formatearDias(planCompleto)}
                    </div>
                  </div>
                )}

                {/* Monto Pagado */}
                {estudiante.membresia.montoPagado > 0 && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <CreditCard size={14} className="text-green-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">Monto Pagado</span>
                    </div>
                    <div className="text-sm lg:text-lg font-bold text-green-600">
                      ${estudiante.membresia.montoPagado.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Método de Pago */}
                {estudiante.membresia.medioPago && (
                  <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1 lg:mb-2">
                      <CreditCard size={14} className="text-blue-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm font-medium text-gray-600">Método de Pago</span>
                    </div>
                    <div className="text-sm lg:text-lg font-bold text-gray-800">
                      {estudiante.membresia.medioPago}
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ MEJORADA: Información de vigencia específica */}
              <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600">
                  <Timer size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="italic">
                    {esDiario ? (
                      estudiante.membresia.fechaDesde && estudiante.membresia.fechaHasta
                        ? `Pase diario válido desde ${estudiante.membresia.fechaDesde.toDate().toLocaleDateString()} hasta las 23:59 de hoy`
                        : 'Pase diario se activará con el pago confirmado'
                    ) : (
                      estudiante.membresia.fechaDesde && estudiante.membresia.fechaHasta
                        ? `Vigencia: Del ${estudiante.membresia.fechaDesde.toDate().toLocaleDateString()} al ${estudiante.membresia.fechaHasta.toDate().toLocaleDateString()}`
                        : 'Se activará con el pago confirmado'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ NUEVO: Botón para contratar nueva membresía (resetear) */}
            {(estadoReal === 'vencido' || estadoReal === 'cancelada') && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl lg:rounded-2xl p-4 lg:p-6"
              >
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <Shield size={20} className="text-blue-600 w-5 h-5 lg:w-6 lg:h-6" />
                    <div>
                      <h3 className="text-sm lg:text-lg font-bold text-blue-800">
                        {estadoReal === 'vencido' ? 'Plan Vencido' : 'Plan Cancelado'}
                      </h3>
                      <p className="text-xs lg:text-sm text-blue-700">
                        {estadoReal === 'vencido' 
                          ? 'Tu plan ha vencido. Renueva para contratar uno nuevo.'
                          : 'Tu plan fue cancelado. Puedes contratar uno nuevo.'
                        }
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleResetMembership}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 lg:px-6 lg:py-2 rounded-lg font-medium transition-colors text-sm lg:text-base w-full sm:w-auto flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="w-4 h-4" />
                        <span>Contratar Nueva Membresía</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Botón para solicitar baja de membresía - Solo para planes mensuales activos */}
            {(estadoReal === 'activa' || estadoReal === 'por_vencer') && !esDiario && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl lg:rounded-2xl p-4 lg:p-6"
              >
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <UserX size={20} className="text-red-600 w-5 h-5 lg:w-6 lg:h-6" />
                    <div>
                      <h3 className="text-sm lg:text-lg font-bold text-red-800">¿Deseas dar de baja tu membresía?</h3>
                      <p className="text-xs lg:text-sm text-red-700">
                        Puedes solicitar la baja de tu membresía en cualquier momento
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCancelModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 lg:px-6 lg:py-2 rounded-lg font-medium transition-colors text-sm lg:text-base w-full sm:w-auto"
                  >
                    Solicitar Baja
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ✅ NUEVA: Información específica para pases diarios */}
            {esDiario && estadoReal === 'activa' && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl lg:rounded-2xl p-4 lg:p-6"
              >
                <div className="flex items-center space-x-2 lg:space-x-3 mb-3">
                  <Sun size={20} className="text-yellow-600 w-5 h-5 lg:w-6 lg:h-6" />
                  <div>
                    <h3 className="text-sm lg:text-lg font-bold text-yellow-800">Pase Diario Activo</h3>
                    <p className="text-xs lg:text-sm text-yellow-700">
                      Tu pase es válido hasta las 23:59 de hoy
                    </p>
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3 text-xs lg:text-sm text-yellow-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={14} className="w-3.5 h-3.5" />
                    <span className="font-medium">Recordatorio importante:</span>
                  </div>
                  <p>
                    Este pase expira automáticamente a las 23:59 de hoy. Si necesitas acceso mañana, 
                    deberás adquirir un nuevo pase diario o considerar un plan mensual.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Badge Premium - Solo para planes activos */}
            {estadoReal === 'activa' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`bg-gradient-to-r ${
                  esDiario 
                    ? 'from-yellow-400 to-yellow-500' 
                    : 'from-yellow-400 to-yellow-500'
                } rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center`}
              >
                <div className="flex items-center justify-center space-x-2 lg:space-x-3 mb-2">
                  {esDiario ? (
                    <Sun size={20} className="text-yellow-800 w-5 h-5 lg:w-6 lg:h-6" />
                  ) : (
                    <Crown size={20} className="text-yellow-800 w-5 h-5 lg:w-6 lg:h-6" />
                  )}
                  <span className="text-lg lg:text-xl font-bold text-yellow-800">
                    {esDiario ? '¡Acceso del Día!' : '¡Miembro Premium!'}
                  </span>
                  {esDiario ? (
                    <Sun size={20} className="text-yellow-800 w-5 h-5 lg:w-6 lg:h-6" />
                  ) : (
                    <Crown size={20} className="text-yellow-800 w-5 h-5 lg:w-6 lg:h-6" />
                  )}
                </div>
                <p className="text-yellow-700 text-sm lg:text-base">
                  {esDiario 
                    ? 'Disfrutás de acceso completo a todas las instalaciones hasta las 23:59'
                    : 'Disfrutás de acceso completo a todas las instalaciones'
                  }
                </p>
              </motion.div>
            )}
          </div>
        ) : (
          /* Estado sin membresía */
          <div className="text-center py-8 lg:py-12">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
              <Shield size={32} className="text-gray-400 w-8 h-8 lg:w-10 lg:h-10" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-700 mb-2">Sin Membresía Activa</h3>
            <p className="text-gray-500 mb-4 lg:mb-6 text-sm lg:text-base">No tenés una membresía activa en este momento</p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 lg:p-6 border border-blue-200">
              <p className="text-blue-700 font-medium text-sm lg:text-base">
                ¡Explorá nuestros planes disponibles y comenzá tu experiencia premium!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación para cancelar membresía - Solo para planes mensuales */}
      <AnimatePresence>
        {showCancelModal && !esDiario && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 w-full max-w-sm sm:max-w-md mx-2 lg:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-2 lg:space-x-3 mb-4 lg:mb-6">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600 w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900">Solicitar Baja de Membresía</h3>
                  <p className="text-xs lg:text-sm text-gray-600">Esta acción requiere aprobación del administrador</p>
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 lg:p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="text-yellow-600 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    <span className="text-xs lg:text-sm font-medium text-yellow-800">
                      Tu membresía será revisada por un administrador
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-yellow-700 mt-2">
                    Una vez aprobada, perderás el acceso a las instalaciones del gimnasio.
                  </p>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                    Motivo de la baja (obligatorio)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Por favor, explica brevemente el motivo de tu solicitud..."
                    className="w-full px-3 py-2 lg:px-4 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm lg:text-base"
                    rows={4}
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 lg:p-4">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm lg:text-base">Información de contacto:</h4>
                  <div className="space-y-1 text-xs lg:text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Mail size={12} className="w-3 h-3 lg:w-[14px] lg:h-[14px]" />
                      <span>{estudiante.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone size={12} className="w-3 h-3 lg:w-[14px] lg:h-[14px]" />
                      <span>{estudiante.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 mt-4 lg:mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm lg:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCancelMembership}
                  disabled={!cancelReason.trim() || isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <UserX size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <span>Enviar Solicitud</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MembresiaProfile;  