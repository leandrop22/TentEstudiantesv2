import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  LogOut,
  ArrowRight,
  UserCheck,
  UserX,
  Clock,
  CreditCard,
  Banknote,
  Building
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Plan } from '../../types/Plan';

interface DashboardMetrics {
  students: {
    total: number;
    activos: number;
    pendientes: number;
    noPagados: number;
    alumnosRegulares: number;
    presentados: number;
    noPresentados: number;
    planDistribution: { [planName: string]: number };
  };
  sessions: {
    total: number;
    enCowork: number;
    hoy: number;
  };
  payments: {
    total: number;
    hoy: number;
    pendientes: number;
    mediosPago: { [medio: string]: number };
  };
  plans: {
    total: number;
    masUsado: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    students: {
      total: 0,
      activos: 0,
      pendientes: 0,
      noPagados: 0,
      alumnosRegulares: 0,
      presentados: 0,
      noPresentados: 0,
      planDistribution: {}
    },
    sessions: {
      total: 0,
      enCowork: 0,
      hoy: 0
    },
    payments: {
      total: 0,
      hoy: 0,
      pendientes: 0,
      mediosPago: {}
    },
    plans: {
      total: 0,
      masUsado: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Definir todos los medios de pago disponibles
  const paymentMethods = ['Efectivo', 'Mercado Pago Transferencia', 'Mercado Pago Posnet', 'Mercado Pago Hospedado'];

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los datos necesarios
      const [studentsSnapshot, sessionsSnapshot, paymentsSnapshot, plansSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'plans'))
      ]);

      // Procesar estudiantes
      const students = studentsSnapshot.docs.map(doc => doc.data());
      const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
      
      const studentMetrics = processStudentMetrics(students, plans);
      const sessionMetrics = processSessionMetrics(sessionsSnapshot.docs.map(doc => doc.data()));
      const paymentMetrics = processPaymentMetrics(paymentsSnapshot.docs.map(doc => doc.data()));
      const planMetrics = processPlanMetrics(plans, students);

      setMetrics({
        students: studentMetrics,
        sessions: sessionMetrics,
        payments: paymentMetrics,
        plans: planMetrics
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processStudentMetrics = (students: any[], plans: Plan[]) => {
    const total = students.length;
    let activos = 0;
    let pendientes = 0;
    let noPagados = 0;
    let alumnosRegulares = 0;
    let presentados = 0;
    let noPresentados = 0;
    const planDistribution: { [planName: string]: number } = {};

    // Inicializar distribución de planes
    plans.forEach(plan => {
      planDistribution[plan.name] = 0;
    });

    students.forEach(student => {
      // Estados de membresía
      const estado = student.membresia?.estado;
      if (estado === 'activa') activos++;
      else if (estado === 'pendiente') pendientes++;
      else noPagados++;

      // Tipos de estudiante (certificado) - corregir lectura del campo
      const certificado = student.certificado;
            
      if (certificado == true ) {
        alumnosRegulares++;
        presentados++; // Los alumnos regulares son "presentados" (certificados)
        
      } else if (certificado == null || false ) {
        noPresentados++; // Los no certificados son "no presentados"
        
      } else {
        console.log('❓ Tipo no reconocido:', certificado);
      }

      // Distribución de planes
      const planName = student.plan || student.membresia?.nombre;
      if (planName && planDistribution.hasOwnProperty(planName)) {
        planDistribution[planName]++;
      }
    });

    return {
      total,
      activos,
      pendientes,
      noPagados,
      alumnosRegulares,
      presentados,
      noPresentados,
      planDistribution
    };
  };

  const processSessionMetrics = (sessions: any[]) => {
    const total = sessions.length;
    const hoy = new Date().toDateString();
    
    // Sesiones activas (sin checkOut)
    const enCowork = sessions.filter(session => !session.checkOutTimestamp).length;
    
    // Sesiones de hoy
    const hoyCount = sessions.filter(session => {
      if (session.checkInTimestamp) {
        const sessionDate = session.checkInTimestamp.toDate ? 
          session.checkInTimestamp.toDate() : 
          new Date(session.checkInTimestamp);
        return sessionDate.toDateString() === hoy;
      }
      return false;
    }).length;

    return {
      total,
      enCowork,
      hoy: hoyCount
    };
  };

  const processPaymentMetrics = (payments: any[]) => {
<<<<<<< HEAD
  const total = payments.length;
  const hoy = new Date().toDateString();
  
  let hoyTotal = 0;
  let pendientes = 0;
  const mediosPago: { [medio: string]: number } = {};

  payments.forEach((payment, index) => {
    console.log(`🔍 Pago ${index + 1}:`, payment);
    
    // Pagos de hoy
    if (payment.fecha) {
      const paymentDate = payment.fecha.toDate ? 
        payment.fecha.toDate() : 
        new Date(payment.fecha);
      if (paymentDate.toDateString() === hoy) {
        hoyTotal += payment.monto || 0;
      }
    }

    // Pagos pendientes
    if (payment.estado === 'pendiente') {
      pendientes++;
    }

    // 🔍 Probar TODOS los campos posibles para medio de pago
    const posiblesCampos = [
      payment.medioPago,
      payment.medoPago, 
      payment.metodo,
      payment.method,
      payment.paymentMethod,
      payment.tipo,
      payment.medio
    ];

    console.log(`🔍 Campos posibles para pago ${index + 1}:`, posiblesCampos);

    // Usar el primer campo que no sea undefined/null
    let medio = posiblesCampos.find(campo => campo != null) || 'Efectivo';
    
    console.log(`✅ Medio seleccionado para pago ${index + 1}:`, medio);

    // Contar
    mediosPago[medio] = (mediosPago[medio] || 0) + 1;
  });

  return {
    total,
    hoy: hoyTotal,
    pendientes,
    mediosPago
  };
};
=======
    const total = payments.length;
    const hoy = new Date().toDateString();
    
    let hoyTotal = 0;
    let pendientes = 0;
    
    // Inicializar todos los medios de pago con 0
    const mediosPago: { [medio: string]: number } = {};
    paymentMethods.forEach(method => {
      mediosPago[method] = 0;
    });

    payments.forEach(payment => {
      // Pagos de hoy
      if (payment.fecha) {
        const paymentDate = payment.fecha.toDate ? 
          payment.fecha.toDate() : 
          new Date(payment.fecha);
        if (paymentDate.toDateString() === hoy) {
          hoyTotal += payment.monto || 0;
        }
      }

      // Pagos pendientes
      if (payment.estado === 'pendiente') {
        pendientes++;
      }

      // Medios de pago - normalizar y contar
      const medio = payment.medioPago || payment.medoPago || 'Efectivo';
      
      
      
      // Si el medio de pago existe en nuestros métodos definidos, incrementar
      if (mediosPago.hasOwnProperty(medio)) {
        mediosPago[medio]++;
        console.log('✅ Medio encontrado y contado:', medio);
      } else {
        // Si no existe, agregarlo como método no reconocido
        console.log('❌ Medio no reconocido:', medio);
        // Crear una entrada para "Otros" si no existe
        if (!mediosPago['Otros']) {
          mediosPago['Otros'] = 0;
        }
        mediosPago['Otros']++;
      }
    });

    return {
      total,
      hoy: hoyTotal,
      pendientes,
      mediosPago
    };
  };
>>>>>>> 7a7873d2b6ab4f552595a5fec508d0605d47bae3

  const processPlanMetrics = (plans: Plan[], students: any[]) => {
    const total = plans.length;
    
    // Encontrar el plan más usado
    const planUsage: { [planName: string]: number } = {};
    students.forEach(student => {
      const planName = student.plan || student.membresia?.nombre;
      if (planName) {
        planUsage[planName] = (planUsage[planName] || 0) + 1;
      }
    });

    const masUsado = Object.entries(planUsage).reduce((a, b) => 
      planUsage[a[0]] > planUsage[b[0]] ? a : b
    )?.[0] || 'Ninguno';

    return {
      total,
      masUsado
    };
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const DashboardCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    children: React.ReactNode;
    gradient: string;
  }> = ({ title, icon, onClick, children, gradient }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${gradient} rounded-2xl p-6 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-xl p-2">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <ArrowRight className="text-white/80" size={20} />
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </motion.div>
  );

  const MetricItem: React.FC<{ label: string; value: string | number; icon?: React.ReactNode }> = 
    ({ label, value, icon }) => (
      <div className="flex items-center justify-between text-white/90">
        <div className="flex items-center space-x-1">
          {icon}
          <span className="text-sm">{label}:</span>
        </div>
        <span className="font-semibold">{value}</span>
      </div>
    );

  // Función helper para obtener el ícono correcto según el medio de pago
  const getPaymentMethodIcon = (medio: string) => {
    if (medio === 'Efectivo') {
      return <Banknote size={14} />;
    }
    return <CreditCard size={14} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">Vista general del coworking</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </motion.button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Estudiantes */}
          <DashboardCard
            title="Estudiantes"
            icon={<Users className="text-white" size={24} />}
            onClick={() => navigate('/admin/students')}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          >
            <MetricItem label="Total" value={metrics.students.total} />
            <MetricItem 
              label="Activos" 
              value={metrics.students.activos} 
              icon={<UserCheck size={14} />} 
            />
            <MetricItem 
              label="Pendientes" 
              value={metrics.students.pendientes} 
              icon={<Clock size={14} />} 
            />
            <MetricItem 
              label="Sin pagar" 
              value={metrics.students.noPagados} 
              icon={<UserX size={14} />} 
            />
            <div className="border-t border-white/20 pt-2 mt-2">
              <MetricItem label="Alumnos Regulares" value={metrics.students.alumnosRegulares} />
              <MetricItem label="Presentados" value={metrics.students.presentados} />
              <MetricItem label="No Presentados" value={metrics.students.noPresentados} />
            </div>
            <div className="border-t border-white/20 pt-2 mt-2">
              {Object.entries(metrics.students.planDistribution).map(([plan, count]) => (
                <MetricItem key={plan} label={plan} value={count} />
              ))}
            </div>
          </DashboardCard>

          {/* Sesiones */}
          <DashboardCard
            title="Sesiones"
            icon={<Activity className="text-white" size={24} />}
            onClick={() => navigate('/admin/sessions')}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
          >
            <MetricItem label="Total" value={metrics.sessions.total} />
            <MetricItem 
              label="En el Cowork" 
              value={metrics.sessions.enCowork} 
              icon={<Building size={14} />} 
            />
            <MetricItem 
              label="Hoy" 
              value={metrics.sessions.hoy} 
              icon={<Clock size={14} />} 
            />
          </DashboardCard>

          {/* Pagos */}
          <DashboardCard
            title="Pagos"
            icon={<DollarSign className="text-white" size={24} />}
            onClick={() => navigate('/admin/payments')}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          >
            <MetricItem label="Total" value={metrics.payments.total} />
            <MetricItem 
              label="Hoy" 
              value={`$${metrics.payments.hoy.toLocaleString()}`} 
              icon={<DollarSign size={14} />} 
            />
            <MetricItem 
              label="Pendientes" 
              value={metrics.payments.pendientes} 
              icon={<Clock size={14} />} 
            />
            <div className="border-t border-white/20 pt-2 mt-2">
              {Object.entries(metrics.payments.mediosPago).map(([medio, count]) => (
                <MetricItem 
                  key={medio} 
                  label={medio} 
                  value={count}
                  icon={getPaymentMethodIcon(medio)}
                />
              ))}
            </div>
          </DashboardCard>

          {/* Planes */}
          <DashboardCard
            title="Planes"
            icon={<Calendar className="text-white" size={24} />}
            onClick={() => navigate('/admin/plans')}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          >
            <MetricItem label="Total" value={metrics.plans.total} />
            <MetricItem label="Más usado" value={metrics.plans.masUsado} />
          </DashboardCard>

          {/* Estadísticas */}
          <DashboardCard
            title="Estadísticas"
            icon={<BarChart3 className="text-white" size={24} />}
            onClick={() => navigate('/admin/stats')}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          >
            <MetricItem label="Ver reportes" value="detallados" />
            <MetricItem label="Análisis" value="completo" />
          </DashboardCard>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchMetrics}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-200"
          >
            Actualizar métricas
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;