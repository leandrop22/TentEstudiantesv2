import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, GraduationCap, CreditCard, Calendar,
  CheckCircle, XCircle, AlertCircle, LogOut, Shield, Star, Edit3,
  Clock, ChevronDown, ChevronUp, AlertTriangle, Timer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  days?: string;
  startHour?: string;
  endHour?: string;
}

interface Estudiante {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  faculty: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string;
  plan?: string;
  membresia?: {
    nombre: string;
    estado: 'activa' | 'pendiente' | 'cancelada' | 'vencido';
    montoPagado: number;
    medioPago: string;
    fechaInicio?: string;
    fechaVencimiento?: string;
  };
}

// Componente PlanCard
interface PlanCardProps {
  plan: Plan;
  onComprar: () => void;
  loading: boolean;
  isDisabled: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onComprar, loading, isDisabled }) => {
  const [expanded, setExpanded] = useState(false);

  const formatearDescripcion = (descripcion: string) => {
    if (!descripcion) return null;

    const lineas = descripcion.split('\n').filter(linea => linea.trim() !== '');
    
    return (
      <div className="text-sm text-gray-700 leading-relaxed">
        {lineas.map((linea, index) => {
          const lineaTrim = linea.trim();
          
          if (lineaTrim.includes('$') && lineaTrim.includes('/')) {
            return (
              <div key={index} className="font-semibold text-gray-900 mb-2">
                {lineaTrim}
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- Horario')) {
            return (
              <div key={index} className="flex items-start space-x-2 mb-1">
                <Clock size={14} className="text-tent-orange mt-0.5 flex-shrink-0" />
                <span>{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('- ')) {
            return (
              <div key={index} className="flex items-start space-x-2 mb-1">
                <div className="w-1 h-1 bg-tent-orange rounded-full mt-2 flex-shrink-0"></div>
                <span>{lineaTrim.substring(2)}</span>
              </div>
            );
          }
          
          if (lineaTrim.startsWith('*')) {
            return (
              <div key={index} className="text-xs text-orange-600 italic mt-2 mb-1 bg-orange-50 p-2 rounded border-l-2 border-orange-300">
                {lineaTrim}
              </div>
            );
          }
          
          if (lineaTrim.endsWith(':')) {
            return (
              <div key={index} className="font-medium text-gray-900 mt-3 mb-2">
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

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-tent-orange transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
    >
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">
              ${plan.price.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
                
            </div>
          </div>
        </div>
        
        {plan.startHour && plan.endHour && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={16} className="text-tent-orange" />
            <span className="text-sm font-medium">
              {plan.startHour} - {plan.endHour}
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        {plan.description && (
          <div className="mb-4">
            <div className={`${expanded ? 'hidden' : 'block'}`}>
              <p className="text-gray-700 text-sm leading-relaxed">
                {plan.description.split('\n')[0]?.trim() || plan.description.substring(0, 120) + '...'}
              </p>
            </div>
            
            <AnimatePresence>
              {expanded && (
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
                onClick={() => setExpanded(!expanded)}
                className="flex items-center space-x-1 text-tent-orange hover:text-orange-600 text-sm font-medium mt-3 transition-colors"
              >
                <span>{expanded ? 'Ver menos' : 'Ver más'}</span>
                {expanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            )}
          </div>
        )}

        {plan.days && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-tent-orange" />
              <span className="text-sm font-medium text-gray-900">Días disponibles:</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{plan.days}</p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComprar}
          disabled={loading || isDisabled}
          className="w-full py-3 bg-gradient-to-r from-tent-orange to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Procesando...</span>
            </>
          ) : isDisabled ? (
            <span>Ya tienes un plan activo</span>
          ) : (
            <>
              <CreditCard size={18} />
              <span>Contratar Plan</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default function ProfileInfo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funciones de validez de fecha
  const verificarValidez = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    return hoy <= vencimiento;
  };

  const getDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  };

  const getEstadoReal = (membresia: any) => {
    if (!membresia) return 'sin_plan';
    
    if (membresia.fechaVencimiento) {
      const esValido = verificarValidez(membresia.fechaVencimiento);
      if (!esValido) return 'vencido';
      
      const diasRestantes = getDiasRestantes(membresia.fechaVencimiento);
      if (diasRestantes <= 7 && diasRestantes > 0) return 'por_vencer';
    }
    
    return membresia.estado;
  };

  const puedeContratarPlan = () => {
    if (!estudiante?.membresia) return true;
    
    const estadoReal = getEstadoReal(estudiante.membresia);
    return estadoReal === 'sin_plan' || estadoReal === 'vencido' || estadoReal === 'cancelada';
  };

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const q = query(collection(db, 'students'), where('email', '==', user.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const estudianteData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Estudiante;
          setEstudiante(estudianteData);
          console.log('Estudiante cargado:', estudianteData);
        }

        const planesSnap = await getDocs(collection(db, 'plans'));
        const planesList: Plan[] = planesSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            description: data.description || '',
            days: data.days || '',
            startHour: data.startHour || '',
            endHour: data.endHour || '',
          };
        });
        setPlanes(planesList);
        console.log('Planes cargados:', planesList);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [user]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !estudiante) return;

    if (!file.type.startsWith('image/')) {
      setMensaje('Por favor selecciona una imagen válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensaje('La imagen debe pesar menos de 5MB.');
      return;
    }

    setUploadingPhoto(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target?.result as string;
        
        await updateDoc(doc(db, 'students', estudiante.id), { 
          fotoURL: imageDataUrl 
        });
        
        setEstudiante({ ...estudiante, fotoURL: imageDataUrl });
        setMensaje('¡Foto de perfil actualizada exitosamente!');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setMensaje('Error al subir la foto. Intentá nuevamente.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const comprarPlan = async (plan: Plan) => {
    if (!estudiante) return;

    if (!puedeContratarPlan()) {
      setMensaje('Ya tenés un plan activo vigente.');
      return;
    }

    setLoading(true);
    try {
      const inicio = new Date();
      const vencimiento = new Date();
      vencimiento.setMonth(vencimiento.getMonth() + 1);

      const updateData = {
        plan: plan.name,
        'membresia.nombre': plan.name,
        'membresia.estado': 'pendiente',
        'membresia.montoPagado': 0,
        'membresia.medioPago': '',
        'membresia.fechaInicio': inicio.toISOString(),
        'membresia.fechaVencimiento': vencimiento.toISOString(),
      };

      await updateDoc(doc(db, 'students', estudiante.id), updateData);
      
      setEstudiante({ 
        ...estudiante, 
        plan: plan.name,
        membresia: {
          nombre: plan.name,
          estado: 'pendiente',
          montoPagado: 0,
          medioPago: '',
          fechaInicio: inicio.toISOString(),
          fechaVencimiento: vencimiento.toISOString(),
        }
      });
      
      setMensaje('¡Plan solicitado! Una vez que realices el pago, tendrás acceso por 1 mes completo desde la fecha de pago.');
    } catch (error) {
      console.error('Error al contratar plan:', error);
      setMensaje('Error al contratar el plan. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const getEstadoColor = (estadoReal: string) => {
    switch (estadoReal) {
      case 'activa': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendiente': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'por_vencer': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'vencido': return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelada': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEstadoIcon = (estadoReal: string) => {
    switch (estadoReal) {
      case 'activa': return <CheckCircle size={20} className="text-green-600" />;
      case 'pendiente': return <AlertCircle size={20} className="text-yellow-600" />;
      case 'por_vencer': return <Timer size={20} className="text-orange-600" />;
      case 'vencido': return <XCircle size={20} className="text-red-600" />;
      case 'cancelada': return <XCircle size={20} className="text-gray-600" />;
      default: return <AlertCircle size={20} className="text-gray-600" />;
    }
  };

  const getEstadoTexto = (estadoReal: string, diasRestantes?: number) => {
    switch (estadoReal) {
      case 'activa': return 'Activa';
      case 'pendiente': return 'Pendiente de pago';
      case 'por_vencer': return `Expira en ${diasRestantes} días`;
      case 'vencido': return 'Plan vencido';
      case 'cancelada': return 'Cancelada';
      default: return 'Estado desconocido';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const planCompleto = getEstudiantePlan();
  const estadoReal = estudiante?.membresia ? getEstadoReal(estudiante.membresia) : 'sin_plan';
  const diasRestantes = estudiante?.membresia?.fechaVencimiento ? getDiasRestantes(estudiante.membresia.fechaVencimiento) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <div className="text-center mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-lg mx-auto mb-6">
              <img
                src="/logorecortadoo.jpg"
                alt="Logo Tent"
                className="object-cover w-full h-full"
              />
            </div>
            <h1 className="text-3xl font-bold text-orange-600 mb-2">Mi Perfil</h1>
            <p className="text-gray-600">Información del estudiante</p>
          </div>

          {estudiante && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-4 border-tent-orange">
                    <img
                      src={estudiante.fotoURL || 'https://via.placeholder.com/80'}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={triggerFileInput}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-tent-orange text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-all duration-200 shadow-lg disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit3 size={14} />
                    )}
                  </motion.button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="text-tent-orange" size={20} />
                      <span className="font-semibold text-gray-800">Información Personal</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Nombre:</span>
                        <span className="font-medium ml-2">{estudiante.fullName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium ml-2">{estudiante.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Teléfono:</span>
                        <span className="font-medium ml-2">{estudiante.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Código:</span>
                        <span className="font-mono bg-tent-orange text-white px-2 py-1 rounded ml-2">
                          {estudiante.accessCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <GraduationCap className="text-green-500" size={20} />
                      <span className="font-semibold text-gray-800">Información Académica</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Facultad:</span>
                        <span className="font-medium ml-2">{estudiante.faculty}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Carrera:</span>
                        <span className="font-medium ml-2">{estudiante.carrera}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Estado de membresía */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="text-tent-orange" size={24} />
            <h2 className="text-2xl font-bold text-gray-800">Estado de Membresía</h2>
          </div>

          {estudiante?.membresia && estudiante.plan ? (
            <div className={`rounded-xl p-6 border-2 ${getEstadoColor(estadoReal)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getEstadoIcon(estadoReal)}
                  <span className="text-lg font-semibold">{estudiante.membresia.nombre}</span>
                </div>
                <span className="text-sm font-medium capitalize px-3 py-1 rounded-full bg-white">
                  {getEstadoTexto(estadoReal, diasRestantes)}
                </span>
              </div>
              
              {/* Alerta de vencimiento */}
              {(estadoReal === 'por_vencer' || estadoReal === 'vencido') && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  estadoReal === 'vencido' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className={estadoReal === 'vencido' ? 'text-red-600' : 'text-orange-600'} />
                    <span className={`text-sm font-medium ${
                      estadoReal === 'vencido' ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      {estadoReal === 'vencido' 
                        ? '¡Tu plan ha vencido! Renovalo para seguir disfrutando del acceso.'
                        : `¡Tu plan vence pronto! Renovalo antes de ${estudiante.membresia.fechaVencimiento ? new Date(estudiante.membresia.fechaVencimiento).toLocaleDateString() : 'la fecha de vencimiento'}.`
                      }
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {estudiante.membresia.fechaInicio && (
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} />
                    <span>Inicio: {new Date(estudiante.membresia.fechaInicio).toLocaleDateString()}</span>
                  </div>
                )}
                {estudiante.membresia.fechaVencimiento && (
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} />
                    <span className={diasRestantes <= 7 && diasRestantes > 0 ? 'font-semibold text-orange-700' : ''}>
                      Válido hasta: {new Date(estudiante.membresia.fechaVencimiento).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <CreditCard size={16} />
                  <span>Plan: {estudiante.membresia.nombre}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star size={16} />
                  <span>Precio: ${planCompleto?.price ? planCompleto.price.toLocaleString() : 'N/A'}</span>
                </div>
                {planCompleto && (
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Clock size={16} />
                    <span>Horarios: {formatearHorario(planCompleto)}</span>
                  </div>
                )}
                {planCompleto?.days && (
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Calendar size={16} />
                    <span>Días: {planCompleto.days}</span>
                  </div>
                )}
                {estudiante.membresia.montoPagado > 0 && (
                  <div className="flex items-center space-x-2">
                    <CreditCard size={16} />
                    <span>Monto pagado: ${estudiante.membresia.montoPagado.toLocaleString()}</span>
                  </div>
                )}
                {estudiante.membresia.medioPago && (
                  <div className="flex items-center space-x-2">
                    <CreditCard size={16} />
                    <span>Método de pago: {estudiante.membresia.medioPago}</span>
                  </div>
                )}
              </div>

              {/* Información de validez */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Timer size={12} />
                  <span className="italic">
                    Validez: 1 mes corrido desde la fecha de pago confirmado
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200 text-center">
              <AlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-700 font-medium">No tenés una membresía activa</p>
              <p className="text-yellow-600 text-sm mt-1">Explorá nuestros planes disponibles</p>
            </div>
          )}
        </motion.div>

        {/* Planes disponibles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Star className="text-green-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">Planes Disponibles</h2>
              <span className="bg-tent-orange text-white px-2 py-1 rounded-full text-sm font-medium">
                ({planes.length})
              </span>
            </div>
          </div>

          {/* Mensaje si no puede contratar */}
          {!puedeContratarPlan() && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-800">
                  Ya tenés un plan activo. Los planes se renuevan automáticamente cada mes desde la fecha de pago.
                </span>
              </div>
            </div>
          )}

          {planes.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {planes.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onComprar={() => comprarPlan(plan)}
                  loading={loading}
                  isDisabled={!puedeContratarPlan()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="text-gray-400 mx-auto mb-3" size={48} />
              <p className="text-gray-600">No hay planes disponibles en este momento</p>
            </div>
          )}
        </motion.div>

        {/* Botón de cerrar sesión */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={cerrarSesion}
            className="flex items-center space-x-2 mx-auto px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Modal de mensaje */}
      <AnimatePresence>
        {mensaje && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                mensaje.includes('Error') || mensaje.includes('error') 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                {mensaje.includes('Error') || mensaje.includes('error') ? (
                  <XCircle className="text-red-600" size={32} />
                ) : (
                  <CheckCircle className="text-green-600" size={32} />
                )}
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {mensaje.includes('Error') || mensaje.includes('error') ? '¡Oops!' : '¡Información!'}
              </h3>
              <p className="text-gray-600 mb-6">{mensaje}</p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMensaje(null)}
                className="w-full py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-orange-600 transition-all duration-200"
              >
                Continuar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}