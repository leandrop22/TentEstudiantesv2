import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Edit3, CheckCircle, XCircle, Camera, Sparkles, Crown, Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'; // ✅ AÑADIDO

// Importar los subcomponentes
import EditProfile from './EditProfile';
import MembresiaProfile from './MembresiaProfile';
import PlansProfile from './PlansProfile';
import PaymentProfile from './PaymentProfile';

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
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string | null;
  plan?: string;
  membresia?: {
    nombre: string;
    estado: 'activa' | 'pendiente' | 'cancelada' | 'vencido';
    montoPagado: number;
    medioPago: string;
    fechaDesde?: Timestamp;
    fechaHasta?: Timestamp;
  };
}

export default function ProfileInfo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ AÑADIDO
  const [params] = useSearchParams(); // ✅ AÑADIDO
  
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FUNCIÓN: Detectar si es pase diario
  const isPaseDiario = (planName: string, price: number = 0) => {
    const nombre = planName.toLowerCase();
    return nombre.includes('diario') || 
           nombre.includes('día') || 
           nombre.includes('day') ||
           (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
           price <= 8000;
  };

  // ✅ FUNCIÓN: Calcular fechas según tipo de plan (igual que PaymentsTable)
  const calcularFechasPlan = (planName: string, price: number, fechaPago: Date) => {
    let fechaDesde: Date;
    let fechaHasta: Date;

    if (isPaseDiario(planName, price)) {
      // Para pase diario: desde el momento del pago hasta las 23:59:59 del mismo día
      fechaDesde = new Date(fechaPago);
      fechaHasta = new Date(fechaPago);
      fechaHasta.setHours(23, 59, 59, 999);
    } else {
      // Para planes mensuales: desde la fecha del pago hasta 30 días después
      fechaDesde = new Date(fechaPago);
      fechaHasta = new Date(fechaPago);
      fechaHasta.setDate(fechaHasta.getDate() + 30);
    }

    return {
      fechaDesde: Timestamp.fromDate(fechaDesde),
      fechaHasta: Timestamp.fromDate(fechaHasta)
    };
  };

  // ✅ NUEVA FUNCIÓN: Confirmar pago desde Mercado Pago
  const confirmarPago = async (paymentId: string, collectionId?: string, externalReference?: string) => {
    setPaymentLoading(true);
    try {
      console.log('=== CONFIRMANDO PAGO DESDE FRONTEND ===');
      console.log('Payment ID:', paymentId);
      console.log('Collection ID:', collectionId);
      console.log('External Reference:', externalReference);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentId || collectionId,
          collectionId,
          externalReference,
          status: params.get('status')
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Respuesta del backend:', result);

      if (result.success) {
        setMensaje('✅ ¡Pago confirmado! Tu membresía ha sido activada exitosamente.');
        
        // Recargar datos del estudiante para reflejar la membresía activa
        if (user) {
          const q = query(collection(db, 'students'), where('email', '==', user.email));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const estudianteData = { 
              ...snapshot.docs[0].data(), 
              uid: snapshot.docs[0].id
            } as Estudiante;
            setEstudiante(estudianteData);
          }
        }
        
        // Limpiar URL y redirigir al perfil
        navigate('/profile', { replace: true });
      } else {
        setMensaje(`❌ ${result.message || 'Error al confirmar el pago'}`);
        navigate('/profile', { replace: true });
      }
      
    } catch (error: any) {
      console.error('❌ Error confirmando pago:', error);
      setMensaje(`❌ Error al confirmar el pago: ${error.message}. Por favor contactanos.`);
      navigate('/profile', { replace: true });
    } finally {
      setPaymentLoading(false);
    }
  };

  // ✅ NUEVO useEffect: Detectar retorno de Mercado Pago
  useEffect(() => {
    // Si el usuario vuelve de Mercado Pago en /payment/success
    if (location.pathname === '/payment/success') {
      const paymentId = params.get('payment_id');
      const collectionId = params.get('collection_id');
      const status = params.get('status');
      const externalReference = params.get('external_reference');

      console.log('=== DETECTADO RETORNO DE MERCADO PAGO ===');
      console.log('Payment ID:', paymentId);
      console.log('Collection ID:', collectionId);
      console.log('Status:', status);
      console.log('External Reference:', externalReference);

      if ((paymentId || collectionId) && status === 'approved') {
        confirmarPago(
          paymentId || collectionId || '', 
          collectionId || undefined, 
          externalReference || undefined
        );
      } else {
        setMensaje('❌ Hubo un problema al procesar tu pago.');
        navigate('/profile', { replace: true });
      }
    }
  }, [location.pathname, params]);

  // Funciones existentes (sin cambios)
  const verificarValidez = (fechaDesde?: Timestamp, fechaHasta?: Timestamp) => {
    if (!fechaDesde || !fechaHasta) return false;
    
    const hoy = new Date();
    const desde = fechaDesde.toDate();
    const hasta = fechaHasta.toDate();
    
    return hoy >= desde && hoy <= hasta;
  };

  const getDiasRestantes = (fechaHasta?: Timestamp) => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  };

  const getHorasRestantes = (fechaHasta?: Timestamp) => {
    if (!fechaHasta) return 0;
    
    const hoy = new Date();
    const hasta = fechaHasta.toDate();
    const diferencia = hasta.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600));
  };

  const getEstadoReal = (membresia: any) => {
    if (!membresia) return 'sin_plan';
    
    if (membresia.fechaDesde && membresia.fechaHasta) {
      const esValido = verificarValidez(membresia.fechaDesde, membresia.fechaHasta);
      if (!esValido) {
        const diasRestantes = getDiasRestantes(membresia.fechaHasta);
        return diasRestantes < 0 ? 'vencido' : 'por_vencer';
      }
      
      if (isPaseDiario(membresia.nombre)) {
        const horasRestantes = getHorasRestantes(membresia.fechaHasta);
        if (horasRestantes <= 2 && horasRestantes > 0) return 'por_vencer';
      } else {
        const diasRestantes = getDiasRestantes(membresia.fechaHasta);
        if (diasRestantes <= 7 && diasRestantes > 0) return 'por_vencer';
      }
      
      return 'activa';
    }
    
    return membresia.estado || 'sin_plan';
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
          const estudianteData = { 
            ...snapshot.docs[0].data(), 
            uid: snapshot.docs[0].id
          } as Estudiante;
          
          if (estudianteData.membresia) {
            const membresia = estudianteData.membresia;
            if (membresia.fechaDesde && typeof membresia.fechaDesde === 'string') {
              membresia.fechaDesde = Timestamp.fromDate(new Date(membresia.fechaDesde));
            }
            if (membresia.fechaHasta && typeof membresia.fechaHasta === 'string') {
              membresia.fechaHasta = Timestamp.fromDate(new Date(membresia.fechaHasta));
            }
          }
          
          setEstudiante(estudianteData);
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
        
        await updateDoc(doc(db, 'students', estudiante.uid), { 
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
      const updateData = {
        plan: plan.name,
        'membresia.nombre': plan.name,
        'membresia.estado': 'pendiente',
        'membresia.montoPagado': 0,
        'membresia.medioPago': '',
        'membresia.fechaDesde': null,
        'membresia.fechaHasta': null,
      };

      await updateDoc(doc(db, 'students', estudiante.uid), updateData);
      
      setEstudiante({ 
        ...estudiante, 
        plan: plan.name,
        membresia: {
          nombre: plan.name,
          estado: 'pendiente',
          montoPagado: 0,
          medioPago: '',
          fechaDesde: undefined,
          fechaHasta: undefined,
        }
      });
      
      const tiempoVigencia = isPaseDiario(plan.name, plan.price) 
        ? 'hasta las 23:59 de hoy' 
        : 'por 1 mes completo';
      
      setMensaje(`¡Plan solicitado! Una vez que realices el pago, tendrás acceso ${tiempoVigencia} desde la fecha de pago.`);
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

  const handleUpdateEstudiante = (updatedEstudiante: Estudiante) => {
    setEstudiante(updatedEstudiante);
  };

  const handleSeleccionarMetodoPago = (plan: Plan) => {
    if (!puedeContratarPlan()) {
      setMensaje('Ya tenés un plan activo vigente.');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayWithMercadoPago = async (plan: Plan) => {
    if (!estudiante) return;

    setPaymentLoading(true);
    try {
      const paymentData = {
        fullName: estudiante.fullName,
        amount: plan.price,
        plan: plan.name,
        studentId: estudiante.uid,
        studentEmail: estudiante.email,
        tipoPlan: isPaseDiario(plan.name, plan.price) ? 'diario' : 'mensual'
      };

      const requestData = {
        paymentData: {
          ...paymentData,
          method: "Mercado Pago Hospedado",
          date: new Date().toISOString(),
          facturado: false
        }
      };
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/payments/create-preference`, {
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
      
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('No se recibió URL de pago de Mercado Pago');
      }
      
    } catch (error: any) {
      console.error('❌ Error en pago con Mercado Pago:', error);
      setMensaje(`Error procesando pago: ${error.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePayWithCash = async (plan: Plan) => {
    if (!estudiante) return;

    setPaymentLoading(true);
    try {
      const updateData = {
        plan: plan.name,
        'membresia.nombre': plan.name,
        'membresia.estado': 'pendiente',
        'membresia.montoPagado': 0,
        'membresia.medioPago': 'Efectivo',
        'membresia.fechaDesde': null,
        'membresia.fechaHasta': null,
      };

      await updateDoc(doc(db, 'students', estudiante.uid), updateData);
      
      setEstudiante({ 
        ...estudiante, 
        plan: plan.name,
        membresia: {
          nombre: plan.name,
          estado: 'pendiente',
          montoPagado: 0,
          medioPago: 'Efectivo',
          fechaDesde: undefined,
          fechaHasta: undefined,
        }
      });
      
      const tiempoVigencia = isPaseDiario(plan.name, plan.price) 
        ? 'hasta las 23:59 de hoy' 
        : 'por 30 días';
      
      setMensaje(`✅ Solicitud registrada para ${plan.name}. Dirigite a recepción para completar el pago de $${plan.price.toLocaleString()}. Una vez confirmado el pago, tendrás acceso ${tiempoVigencia}.`);
      setShowPaymentModal(false);
      setSelectedPlan(null);
      
    } catch (error: any) {
      console.error('❌ Error en pago en efectivo:', error);
      setMensaje(`Error registrando pago: ${error.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center space-y-4 lg:space-y-6"
        >
          <div className="relative">
            <div className="w-16 h-16 lg:w-20 lg:h-20 border-4 border-purple-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 lg:w-20 lg:h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">
              {paymentLoading ? 'Procesando tu pago...' : 'Cargando tu perfil...'}
            </h2>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Layout Mobile-First Optimizado */}
      <div className="px-3 py-4 lg:px-6 lg:py-6">
        <div className="max-w-sm mx-auto sm:max-w-xl md:max-w-3xl lg:max-w-6xl space-y-4 lg:space-y-8">
          
          {/* Header Ultra Compacto para Móvil */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl lg:rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Banner Super Compacto */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-16 lg:h-32 relative">
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-6">
                <div className="flex items-end space-x-2 lg:space-x-3">
                  {/* Foto Súper Compacta */}
                  <div className="relative">
                    <div className="w-10 h-10 lg:w-24 lg:h-24 rounded-full overflow-hidden bg-white border-2 border-white shadow-xl">
                      <img
                        src={estudiante?.fotoURL || 'https://placehold.co/100x100/aabbcc/ffffff?text=User'}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={triggerFileInput}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-0.5 -right-0.5 lg:-bottom-1 lg:-right-1 w-4 h-4 lg:w-8 lg:h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <div className="w-2 h-2 lg:w-4 lg:h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera size={8} className="lg:w-4 lg:h-4" />
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
                  
                  {/* Info Usuario Súper Compacta */}
                  <div className="text-white mb-0.5 lg:mb-1 flex-1 min-w-0">
                    <h1 className="text-xs sm:text-sm lg:text-2xl font-bold truncate">{estudiante?.fullName}</h1>
                    <p className="text-white/80 text-xs lg:text-base truncate">{estudiante?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resto del componente exactamente igual... */}
            <div className="p-3 lg:p-8">
              <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-3 lg:mb-6">
                <div className="flex flex-col space-y-1 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
                  <div className="flex items-center space-x-1 lg:space-x-2">
                    <Crown className="text-yellow-500 w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-800">Perfil de Estudiante</span>
                  </div>
                  <span className="bg-gradient-to-r from-orange-500 to-pink-100 text-black px-2 py-0.5 lg:py-1 rounded-full text-xs font-medium border border-orange-300 self-start">
                    Código: {estudiante?.accessCode}
                  </span>
                </div>
                
                {estudiante && (
                  <EditProfile
                    estudiante={estudiante}
                    onUpdate={handleUpdateEstudiante}
                    onMessage={setMensaje}
                  />
                )}
              </div>

              {/* Info Cards Compactas */}
              <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-2 lg:gap-4 lg:space-y-0 mb-3 lg:mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 lg:p-3 border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <User className="text-blue-600 w-3 h-3 lg:w-4 lg:h-4" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-blue-700 font-medium">Teléfono</span>
                      <div className="text-xs sm:text-sm lg:text-sm text-gray-800 font-semibold truncate">{estudiante?.phone}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 lg:p-3 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="text-green-600 w-3 h-3 lg:w-4 lg:h-4" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-green-700 font-medium">Universidad</span>
                      <div className="text-xs sm:text-sm lg:text-sm text-gray-800 font-semibold truncate">{estudiante?.university}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje Bienvenida */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 lg:p-6 border border-orange-200">
                <div className="flex items-start space-x-2">
                  <Heart className="text-red-500 mt-0.5 flex-shrink-0 w-3 h-3 lg:w-4 lg:h-4" />
                  <div>
                    <h3 className="text-sm lg:text-lg font-bold text-gray-800 mb-1">¡Bienvenido/a!</h3>
                    <p className="text-xs lg:text-base text-gray-700 leading-relaxed">
                      Gestiona tu membresía y explora nuevos planes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Resto de componentes */}
          {estudiante && (
            <MembresiaProfile
              estudiante={estudiante}
              planes={planes}
              onMessage={setMensaje}
            />
          )}

          <PlansProfile
            planes={planes}
            onComprarPlan={comprarPlan}
            onSeleccionarMetodoPago={handleSeleccionarMetodoPago}
            loading={loading}
            puedeContratarPlan={puedeContratarPlan()}
            estudianteConPlan={!!estudiante?.plan}
          />

          {/* Botón Cerrar Sesión */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={cerrarSesion}
              className="flex items-center space-x-2 mx-auto px-4 py-2 lg:px-8 lg:py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg lg:rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm lg:text-base"
            >
              <LogOut size={14} className="lg:w-4 lg:h-4" />
              <span>Cerrar Sesión</span>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Modal de pago */}
      <PaymentProfile
        plan={selectedPlan}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPlan(null);
        }}
        loading={paymentLoading}
        onMessage={setMensaje}
        onPayWithMercadoPago={handlePayWithMercadoPago}
        onPayWithCash={handlePayWithCash}
        studentData={{
          id: estudiante?.uid || '',
          fullName: estudiante?.fullName || '',
          email: estudiante?.email || ''
        }}
      />

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
              className="bg-white rounded-2xl p-4 lg:p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4 ${
                mensaje.includes('Error') || mensaje.includes('error') 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                {mensaje.includes('Error') || mensaje.includes('error') ? (
                  <XCircle className="text-red-600 w-6 h-6 lg:w-8 lg:h-8" />
                ) : (
                  <CheckCircle className="text-green-600 w-6 h-6 lg:w-8 lg:h-8" />
                )}
              </div>
              
              <h3 className="text-base lg:text-lg font-bold text-gray-800 mb-2">
                {mensaje.includes('Error') || mensaje.includes('error') ? '¡Oops!' : '¡Perfecto!'}
              </h3>
              <p className="text-sm lg:text-sm text-gray-600 mb-4 lg:mb-6 leading-relaxed">{mensaje}</p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMensaje(null)}
                className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm lg:text-base"
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