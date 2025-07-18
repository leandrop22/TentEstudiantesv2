import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Edit3, CheckCircle, XCircle, Camera, Sparkles, Crown, Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

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
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string;
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
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            id: snapshot.docs[0].id 
          } as Estudiante;
          
          // Asegurar que membresia tenga la estructura correcta
          if (estudianteData.membresia) {
            // Convertir fechas string a Timestamp si es necesario
            const membresia = estudianteData.membresia;
            if (membresia.fechaDesde && typeof membresia.fechaDesde === 'string') {
              membresia.fechaDesde = Timestamp.fromDate(new Date(membresia.fechaDesde));
            }
            if (membresia.fechaHasta && typeof membresia.fechaHasta === 'string') {
              membresia.fechaHasta = Timestamp.fromDate(new Date(membresia.fechaHasta));
            }
          }
          
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
      const updateData = {
        plan: plan.name,
        'membresia.nombre': plan.name,
        'membresia.estado': 'pendiente',
        'membresia.montoPagado': 0,
        'membresia.medioPago': '',
        // Solo se crean vacíos hasta que se haga el pago
        'membresia.fechaDesde': null,
        'membresia.fechaHasta': null,
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
          fechaDesde: undefined,
          fechaHasta: undefined,
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
    setPaymentLoading(true);
    try {
      if (!estudiante) {
        setMensaje('Error: No se encontró información del estudiante');
        return;
      }

      // Usar EXACTAMENTE la misma estructura que PaymentsTable
      const paymentData = {
        fullName: estudiante.fullName,
        amount: plan.price,
        method: 'Mercado Pago Hospedado', // Usar el mismo método que en PaymentsTable
        date: new Date().toISOString().split('T')[0],
        facturado: false, // Inicialmente false, se actualiza cuando se confirme el pago
        plan: plan.name,
        studentId: estudiante.id,
        // Campos adicionales para Mercado Pago
        status: 'pending',
        mercadoPagoId: '', // Se llenará después
      };

      console.log('=== CREANDO PAGO MERCADO PAGO ===');
      console.log('Datos del pago:', paymentData);

      // 1. Crear el registro de pago en la colección 'payments' (igual que PaymentsTable)
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      console.log('✅ Pago creado con ID:', docRef.id);

      // 2. Aquí iría la lógica para crear la preferencia en Mercado Pago
      // Por ahora simulamos la creación de la preferencia
      const mockMercadoPagoResponse = {
        id: 'MP_' + Date.now(),
        init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=MP_${Date.now()}`,
        status: 'pending'
      };

      // 3. Actualizar el pago con el ID de Mercado Pago
      await updateDoc(doc(db, 'payments', docRef.id), {
        mercadoPagoId: mockMercadoPagoResponse.id,
        status: 'pending'
      });

      // 4. Actualizar el estudiante con estado 'pendiente' (igual que efectivo pero sin activar aún)
      const studentRef = doc(db, 'students', estudiante.id);
      const updateData = {
        plan: plan.name,
        'membresia.nombre': plan.name,
        'membresia.estado': 'pendiente', // Pendiente hasta que se confirme el pago
        'membresia.montoPagado': 0, // Aún no pagado
        'membresia.medioPago': 'Mercado Pago Hospedado',
        'membresia.fechaDesde': null, // Se establecerá cuando se confirme el pago
        'membresia.fechaHasta': null,
        // NO establecemos activo: true hasta confirmar el pago
      };

      await updateDoc(studentRef, updateData);
      console.log('✅ Estudiante actualizado con estado pendiente');

      setMensaje('¡Redirigiendo a Mercado Pago! Tu plan se activará automáticamente cuando confirmes el pago.');
      setShowPaymentModal(false);
      
      // Simular redirección a Mercado Pago
      console.log('🔗 URL de pago:', mockMercadoPagoResponse.init_point);
      // window.open(mockMercadoPagoResponse.init_point, '_self');
      
      // Por ahora solo mostramos un alert con la URL simulada
      alert(`Redirigiendo a Mercado Pago...\nURL: ${mockMercadoPagoResponse.init_point}`);
      
    } catch (error) {
      console.error('❌ Error procesando pago con Mercado Pago:', error);
      setMensaje('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePayWithCash = async (plan: Plan) => {
    setPaymentLoading(true);
    try {
      // Usar la lógica existente de comprarPlan que ya es consistente con PaymentsTable
      await comprarPlan(plan);
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error procesando pago en efectivo:', error);
      setMensaje('Error al procesar la solicitud. Intenta nuevamente.');
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
          className="flex flex-col items-center space-y-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-tent-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargando tu perfil...</h2>
          
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Principal del Perfil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Banner superior con gradiente */}
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-32 relative">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end space-x-4">
                {/* Foto de perfil */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-xl">
                    <img
                      src={estudiante?.fotoURL || '/logorecortadoo.jpg'}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={triggerFileInput}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera size={14} />
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
                
                {/* Información del usuario */}
                <div className="text-white mb-2">
                  <h1 className="text-2xl font-bold">{estudiante?.fullName}</h1>
                  <p className="text-white/80">{estudiante?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido del header */}
          <div className="p-8 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Crown className="text-yellow-500" size={24} />
                  <span className="text-lg font-semibold text-gray-800">Perfil de Estudiante</span>
                </div>
                <span className="bg-gradient-to-r from-orange-500 to-pink-100 text-black px-3 py-1 rounded-full text-sm font-medium border border-tent-orange">
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

            {/* Información básica en cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <User className="text-blue-600" size={20} />
                  <div>
                    <span className="text-sm text-blue-700 font-medium">Información Personal</span>
                    <div className="text-gray-800 font-semibold">{estudiante?.phone}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center space-x-3">
                  <Sparkles className="text-green-600" size={20} />
                  <div>
                    <span className="text-sm text-green-700 font-medium">Información Académica</span>
                    <div className="text-gray-800 font-semibold">{estudiante?.university}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje de bienvenida */}
            <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center space-x-3 mb-3">
                <Heart className="text-red-500" size={24} />
                <h3 className="text-lg font-bold text-gray-800">¡Bienvenido/a de nuevo!</h3>
              </div>
              <p className="text-gray-700">
                Estamos felices de tenerte en nuestra comunidad. Aquí podés gestionar tu membresía, 
                explorar nuevos planes y mantener actualizada tu información personal.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Componente de Membresía */}
        {estudiante && (
          <MembresiaProfile
            estudiante={estudiante}
            planes={planes}
          />
        )}

        {/* Componente de Planes */}
        <PlansProfile
          planes={planes}
          onComprarPlan={comprarPlan}
          onSeleccionarMetodoPago={handleSeleccionarMetodoPago}
          loading={loading}
          puedeContratarPlan={puedeContratarPlan()}
          estudianteConPlan={!!estudiante?.plan}
        />

        {/* Botón de cerrar sesión */}
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
            className="flex items-center space-x-3 mx-auto px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Modal de selección de método de pago */}
      <PaymentProfile
        plan={selectedPlan}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPlan(null);
        }}
        onPayWithMercadoPago={handlePayWithMercadoPago}
        onPayWithCash={handlePayWithCash}
        loading={paymentLoading}
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
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                mensaje.includes('Error') || mensaje.includes('error') 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                {mensaje.includes('Error') || mensaje.includes('error') ? (
                  <XCircle className="text-red-600" size={40} />
                ) : (
                  <CheckCircle className="text-green-600" size={40} />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {mensaje.includes('Error') || mensaje.includes('error') ? '¡Oops!' : '¡Perfecto!'}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">{mensaje}</p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMensaje(null)}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
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