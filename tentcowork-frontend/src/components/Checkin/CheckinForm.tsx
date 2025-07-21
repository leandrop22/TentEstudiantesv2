import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, CheckCircle, XCircle,
  ArrowRight, Delete, Mail, Users, AlertTriangle, Timer, Clock
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import {
  checkInOrOut,
  checkStudentStatus,
  recoverCodeByEmail
} from '../../services/checkInService';

interface Student {
  fullName?: string;
  email?: string;
  plan?: any;
  membresia?: {
    nombre?: string;
    fechaDesde?: string | Timestamp;
    fechaHasta?: string | Timestamp;
  };
  isCheckedIn?: boolean;
  accessCode?: string;
}

interface CheckInResult {
  success: boolean;
  message: string;
  action?: 'check-in' | 'check-out';
  time?: string;
  duration?: string;
  user?: {
    name: string;
    email: string;
    plan: string;
    membresiaStatus?: 'activa' | 'pendiente' | 'vencida' | 'por_vencer';
    fechaDesde?: string | Timestamp;
    fechaHasta?: string | Timestamp;
    diasRestantes?: number;
  };
  recovery?: boolean;
}

type NumericKeypadProps = {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
};

const NumericKeypad: React.FC<NumericKeypadProps> = ({ onKeyPress, onDelete, onSubmit }) => {
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']];
  return (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {keys.flat().map(key => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onKeyPress(key)}
          className="h-16 bg-white border-2 border-gray-200 rounded-xl text-2xl font-semibold text-gray-800 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm"
        >
          {key}
        </motion.button>
      ))}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDelete}
        className="h-16 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 shadow-sm flex items-center justify-center"
      >
        <Delete size={24} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSubmit}
        className="h-16 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-200 shadow-sm flex items-center justify-center"
      >
        <ArrowRight size={24} />
      </motion.button>
    </div>
  );
};

export const CheckInForm = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-cerrar modal para resultados exitosos
  useEffect(() => {
    if (result && result.success && !result.recovery && result.user) {
      // Solo auto-cerrar para check-in/check-out exitosos, no para errores ni recovery
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            resetForm();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [result]);

  // Limpiar countdown si cambia el resultado
  useEffect(() => {
    if (!result || !result.success || result.recovery || !result.user) {
      setCountdown(null);
    }
  }, [result]);

  // Función para convertir fecha a Date independientemente del tipo
  const convertirADate = (fecha: string | Timestamp | undefined): Date | null => {
    if (!fecha) return null;
    
    if (typeof fecha === 'string') {
      return new Date(fecha);
    } else if (fecha instanceof Timestamp) {
      return fecha.toDate();
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      // Por si es un Timestamp de Firebase pero sin el tipo correcto
      return (fecha as any).toDate();
    }
    
    return null;
  };

  // Función para verificar si está dentro del horario permitido
  const verificarHorarioPermitido = (plan: any) => {
    if (!plan || !plan.startHour || !plan.endHour) {
      console.log('❌ Plan sin horarios definidos', plan);
      return {
        permitido: false,
        mensaje: 'Plan sin horarios definidos'
      };
    }

    const ahora = new Date();
    const horaActual = ahora.getHours() * 100 + ahora.getMinutes(); // Formato HHMM (ej: 1430 = 14:30)
    
    // Convertir horarios del plan a formato numérico
    const startHour = String(plan.startHour).replace(':', '');
    const endHour = String(plan.endHour).replace(':', '');
    const horaInicio = parseInt(startHour); // ej: "08:00" -> 800
    const horaFin = parseInt(endHour); // ej: "21:30" -> 2130

    console.log('=== VERIFICACIÓN DE HORARIOS ===');
    console.log('Hora actual:', ahora.toLocaleTimeString());
    console.log('Hora actual (numérica):', horaActual);
    console.log('Horario del plan:', `${plan.startHour} - ${plan.endHour}`);
    console.log('Hora inicio (numérica):', horaInicio);
    console.log('Hora fin (numérica):', horaFin);

    // Verificar si está dentro del horario
    if (horaActual >= horaInicio && horaActual <= horaFin) {
      console.log('✅ Acceso dentro del horario permitido');
      return {
        permitido: true,
        mensaje: `Acceso permitido (${plan.startHour} - ${plan.endHour})`
      };
    } else {
      console.log('❌ Acceso fuera del horario permitido');
      return {
        permitido: false,
        mensaje: `Acceso fuera del horario permitido. Tu plan "${plan.name || 'actual'}" permite acceso de ${plan.startHour} a ${plan.endHour}`
      };
    }
  };

  // Función para verificar validez de membresía (compatible con string y Timestamp)
  const verificarEstadoMembresia = (membresia: any) => {
    if (!membresia || !membresia.fechaDesde || !membresia.fechaHasta) {
      return {
        status: 'pendiente',
        diasRestantes: 0,
        mensaje: 'Membresía pendiente de activación'
      };
    }

    const hoy = new Date();
    const desde = convertirADate(membresia.fechaDesde);
    const hasta = convertirADate(membresia.fechaHasta);

    console.log('=== VERIFICACIÓN DE MEMBRESÍA ===');
    console.log('Hoy:', hoy.toISOString());
    console.log('Desde:', desde?.toISOString() || 'null');
    console.log('Hasta:', hasta?.toISOString() || 'null');

    if (!desde || !hasta) {
      return {
        status: 'pendiente',
        diasRestantes: 0,
        mensaje: 'Fechas de membresía inválidas'
      };
    }

    // Verificar si está en el período de vigencia
    if (hoy < desde) {
      console.log('❌ Membresía aún no activada (fecha futura)');
      return {
        status: 'pendiente',
        diasRestantes: 0,
        mensaje: 'Membresía aún no activada'
      };
    }

    if (hoy > hasta) {
      console.log('❌ Membresía vencida');
      return {
        status: 'vencida',
        diasRestantes: 0,
        mensaje: 'Membresía vencida'
      };
    }

    // Calcular días restantes
    const diferencia = hasta.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 3600 * 24));

    console.log('✅ Membresía válida');
    console.log('Días restantes:', diasRestantes);

    if (diasRestantes <= 7) {
      console.log('⚠️ Membresía por vencer');
      return {
        status: 'por_vencer',
        diasRestantes,
        mensaje: `Membresía por vencer en ${diasRestantes} días`
      };
    }

    console.log('✅ Membresía activa');
    return {
      status: 'activa',
      diasRestantes,
      mensaje: 'Membresía activa'
    };
  };

  const handleKeyPress = (key: string) => {
    if (code.length !== 5) {
      setCode(prev => prev + key);
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (code.length < 3) return;

    setLoading(true);
    setResult(null);

    try {
      const student: Student = await checkStudentStatus(code);
      
      console.log('=== ESTUDIANTE OBTENIDO ===');
      console.log('Datos del estudiante:', student);
      console.log('Membresía:', student?.membresia);
      console.log('Plan:', student?.plan);

      // Verificar que el estudiante tiene los datos necesarios
      if (!student) {
        throw new Error('No se pudieron obtener los datos del estudiante');
      }

      // Verificar estado de membresía usando las fechas (compatible con string y Timestamp)
      const estadoMembresia = verificarEstadoMembresia(student.membresia);
      console.log('Estado de membresía calculado:', estadoMembresia);

      // Si la membresía no está activa, rechazar el acceso
      if (estadoMembresia.status === 'vencida') {
        setResult({
          success: false,
          message: 'Acceso denegado: Tu membresía ha vencido. Contacta al administrador para renovarla.',
          user: {
            name: student.fullName || 'Usuario',
            email: student.email || '',
            plan: student.membresia?.nombre || student.plan?.name || 'Sin plan',
            membresiaStatus: 'vencida',
            fechaDesde: student.membresia?.fechaDesde,
            fechaHasta: student.membresia?.fechaHasta,
            diasRestantes: 0
          }
        });
        setLoading(false);
        return;
      }

      if (estadoMembresia.status === 'pendiente') {
        setResult({
          success: false,
          message: 'Acceso denegado: Tu membresía está pendiente de activación. Realiza el pago para activarla.',
          user: {
            name: student.fullName || 'Usuario',
            email: student.email || '',
            plan: student.membresia?.nombre || student.plan?.name || 'Sin plan',
            membresiaStatus: 'pendiente',
            fechaDesde: student.membresia?.fechaDesde,
            fechaHasta: student.membresia?.fechaHasta,
            diasRestantes: 0
          }
        });
        setLoading(false);
        return;
      }

      // NUEVA VALIDACIÓN: Verificar horario del plan
      const validacionHorario = verificarHorarioPermitido(student.plan);
      if (!validacionHorario.permitido) {
        setResult({
          success: false,
          message: validacionHorario.mensaje,
          user: {
            name: student.fullName || 'Usuario',
            email: student.email || '',
            plan: student.membresia?.nombre || student.plan?.name || 'Sin plan',
            membresiaStatus: estadoMembresia.status as 'activa' | 'por_vencer',
            fechaDesde: student.membresia?.fechaDesde,
            fechaHasta: student.membresia?.fechaHasta,
            diasRestantes: estadoMembresia.diasRestantes
          }
        });
        setLoading(false);
        return;
      }

      // Si llegamos aquí, la membresía está activa y está dentro del horario permitido
      const { mensaje, estado } = await checkInOrOut(code);

      setResult({
        success: estado !== 'rechazado',
        message: mensaje,
        action: estado === 'entrada' ? 'check-in' : 'check-out',
        time: new Date().toLocaleTimeString(),
        user: {
          name: student.fullName || 'Usuario',
          email: student.email || '',
          plan: student.membresia?.nombre || student.plan?.name || 'Sin plan',
          membresiaStatus: estadoMembresia.status as 'activa' | 'por_vencer',
          fechaDesde: student.membresia?.fechaDesde,
          fechaHasta: student.membresia?.fechaHasta,
          diasRestantes: estadoMembresia.diasRestantes
        }
      });

    } catch (error) {
      console.error('Error en check-in:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }

    setLoading(false);
  };

  const handleRecovery = async () => {
    setLoading(true);
    try {
      const codigo = await recoverCodeByEmail(recoveryEmail);

      setResult({
        success: true,
        message: `Tu código de acceso es: ${codigo}`,
        recovery: true
      });

      setShowRecovery(false);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error al recuperar el código'
      });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setResult(null);
    setShowRecovery(false);
    setRecoveryEmail('');
    setCountdown(null);
  };

  const getMembresiaStatusColor = (status?: string) => {
    switch (status) {
      case 'activa': return 'text-green-600';
      case 'por_vencer': return 'text-orange-600';
      case 'vencida': return 'text-red-600';
      case 'pendiente': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getMembresiaStatusIcon = (status?: string) => {
    switch (status) {
      case 'activa': return <CheckCircle size={16} className="text-green-600" />;
      case 'por_vencer': return <Timer size={16} className="text-orange-600" />;
      case 'vencida': return <XCircle size={16} className="text-red-600" />;
      case 'pendiente': return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <AlertTriangle size={16} className="text-gray-600" />;
    }
  };

  const getMembresiaStatusText = (status?: string, diasRestantes?: number) => {
    switch (status) {
      case 'activa': return `Activa (${diasRestantes} días restantes)`;
      case 'por_vencer': return `Por vencer (${diasRestantes} días)`;
      case 'vencida': return 'Vencida';
      case 'pendiente': return 'Pendiente de pago';
      default: return 'Estado desconocido';
    }
  };

  // Función para mostrar fecha en formato legible
  const formatearFecha = (fecha: string | Timestamp | undefined): string => {
    const fechaDate = convertirADate(fecha);
    return fechaDate ? fechaDate.toLocaleDateString() : 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-auto"
      >
        
        {/* Header */}
        <div className="text-center mb-1">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-lg mx-auto mb-6">
            <img

              src="/logorecortadoo.jpg"

              alt="Logo Tent"
              className="object-cover w-full h-full"
            />
          </div>

          <h1 className="text-3xl font-bold text-tent-orange mb-2">Check-in / Check-out</h1>
          <h2 className="text-2xl font-bold text-tent-green mb-3">Estudiantes</h2>
          <p className="text-gray-600 text-base">Ingresa tu código de acceso</p>
        </div>
        
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
              <p className="text-white text-lg font-medium">Verificando acceso...</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showRecovery ? (
            <motion.div key="checkin" className="space-y-6">
              {/* Código */}
              <div className="relative">
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-blue-400 transition-all duration-200">
                  <div className="flex items-center space-x-2">
                    <User className="text-gray-400" size={20} />
                    <input
                      type="text"
                      value={code}
                      readOnly
                      placeholder="Código de acceso"
                      className="bg-transparent text-2xl font-mono text-center flex-1 focus:outline-none text-gray-800"
                    />
                  </div>
                </div>
                <div className="flex justify-center mt-3 space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${i < code.length ? 'bg-tent-orange' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>

              <NumericKeypad
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                onSubmit={handleSubmit}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRecovery(true)}
                className="w-full py-3 text-tent-orange font-medium hover:underline rounded-xl transition-all duration-200"
              >
                ¿Olvidaste tu código?
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="recovery" className="space-y-6">
              <div className="text-center mb-5">
                <Mail className="text-tent-orange mx-auto mb-2" size={32} />
                <h2 className="text-xl font-semibold text-gray-800">Recuperar código</h2>
                <p className="text-gray-600 text-sm">Ingresa tu email registrado</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                <div className="flex items-center space-x-2">
                  <Mail className="text-gray-400" size={20} />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="bg-transparent text-lg flex-1 focus:outline-none text-gray-800"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRecovery(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRecovery}
                  disabled={!recoveryEmail || loading}
                  className="flex-1 py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-orange-600 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Enviar
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal de resultado */}
      <AnimatePresence>
        {result && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-3xl p-8 max-w-sm w-full text-center ${
                result.recovery ? 'bg-white' : 'bg-white'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.success ? 'bg-tent-green' : 'bg-red-100'
              }`}>
                {result.success ? (
                  <CheckCircle className="text-white" size={32} />
                ) : result.message.includes('horario') ? (
                  <Clock className="text-red-600" size={32} />
                ) : (
                  <XCircle className="text-red-600" size={32} />
                )}
              </div>

              {result.recovery ? (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-tent-green">Código encontrado</h3>
                  <p className="text-gray-600">{result.message}</p>
                </div>
              ) : result.success && result.user ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {result.action === 'check-in' ? '¡Bienvenido!' : '¡Hasta pronto!'}
                  </h3>
                  <p className="text-gray-600 mb-4">{result.user.name}</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium">{result.user.plan}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Hora:</span>
                      <span className="font-medium">{result.time}</span>
                    </div>
                    {result.user.membresiaStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Estado:</span>
                        <div className="flex items-center space-x-1">
                          {getMembresiaStatusIcon(result.user.membresiaStatus)}
                          <span className={`font-medium ${getMembresiaStatusColor(result.user.membresiaStatus)}`}>
                            {getMembresiaStatusText(result.user.membresiaStatus, result.user.diasRestantes)}
                          </span>
                        </div>
                      </div>
                    )}
                    {result.user.fechaHasta && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Válido hasta:</span>
                        <span className="font-medium">
                          {formatearFecha(result.user.fechaHasta)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Alerta para membresías por vencer */}
                  {result.user.membresiaStatus === 'por_vencer' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="text-orange-600" size={16} />
                        <span className="text-sm text-orange-800 font-medium">
                          Tu membresía vence pronto. ¡Renuévala para continuar!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Indicador de cierre automático */}
                  {countdown && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Timer className="text-green-600" size={16} />
                        <span className="text-sm text-green-800 font-medium">
                          Cerrando en {countdown} segundo{countdown !== 1 ? 's' : ''}...
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-red-600 mb-2">
                    {result.message.includes('horario') ? 'Fuera de Horario' :
                     result.user?.membresiaStatus === 'vencida' ? 'Membresía Vencida' : 
                     result.user?.membresiaStatus === 'pendiente' ? 'Membresía Pendiente' : 'Error'}
                  </h3>
                  <p className="text-gray-600 mb-4">{result.message}</p>
                  
                  {/* Información adicional del usuario si está disponible */}
                  {result.user && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Estudiante:</span>
                        <span className="font-medium">{result.user.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Plan:</span>
                        <span className="font-medium">{result.user.plan}</span>
                      </div>
                      {result.user.membresiaStatus && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Estado:</span>
                          <div className="flex items-center space-x-1">
                            {getMembresiaStatusIcon(result.user.membresiaStatus)}
                            <span className={`font-medium ${getMembresiaStatusColor(result.user.membresiaStatus)}`}>
                              {getMembresiaStatusText(result.user.membresiaStatus, result.user.diasRestantes)}
                            </span>
                          </div>
                        </div>
                      )}
                      {result.user.fechaHasta && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {result.user.membresiaStatus === 'vencida' ? 'Venció el:' : 'Válido hasta:'}
                          </span>
                          <span className="font-medium">
                            {formatearFecha(result.user.fechaHasta)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Alerta especial para horarios */}
                  {result.message.includes('horario') && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="text-blue-600" size={16} />
                        <span className="text-sm text-blue-800 font-medium">
                          Intenta acceder durante el horario permitido de tu plan
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Botón Continuar - Solo mostrar si NO es un resultado exitoso con countdown */}
              {!(result.success && result.user && countdown) && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetForm}
                  className="w-full py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-orange-600 transition-all duration-200"
                >
                  Continuar
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckInForm;