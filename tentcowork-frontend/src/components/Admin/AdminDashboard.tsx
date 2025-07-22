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
  Building,
  RefreshCw
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { collection, getDocs, query, where, limit, orderBy, getCountFromServer } from 'firebase/firestore';
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
  lastUpdate: number;
  cacheExpiry: number;
}

// ✅ CLAVE: Cache del navegador con expiración
const CACHE_KEY = 'adminDashboardMetrics';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

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
    },
    lastUpdate: 0,
    cacheExpiry: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [cacheUsed, setCacheUsed] = useState(false);
  const navigate = useNavigate();

  const paymentMethods = ['Efectivo', 'Mercado Pago Transferencia', 'Mercado Pago Posnet', 'Mercado Pago Hospedado'];

  // ✅ Cache del navegador - Cargar datos en caché
  const loadFromCache = (): DashboardMetrics | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        console.log('🔍 Verificando cache:', {
          'Cache timestamp': new Date(data.lastUpdate).toLocaleString(),
          'Current time': new Date(now).toLocaleString(),
          'Cache valid': now < data.cacheExpiry
        });
        
        if (now < data.cacheExpiry) {
          console.log('✅ Usando datos desde cache');
          setCacheUsed(true);
          return data;
        } else {
          console.log('⏰ Cache expirado, eliminando...');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('❌ Error leyendo cache:', error);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  // ✅ Cache del navegador - Guardar datos en caché
  const saveToCache = (data: DashboardMetrics) => {
    try {
      const now = Date.now();
      const dataToCache = {
        ...data,
        lastUpdate: now,
        cacheExpiry: now + CACHE_DURATION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
      console.log('💾 Datos guardados en cache hasta:', new Date(dataToCache.cacheExpiry).toLocaleString());
    } catch (error) {
      console.error('❌ Error guardando cache:', error);
    }
  };

  useEffect(() => {
    // Intentar cargar desde cache primero
    const cachedData = loadFromCache();
    if (cachedData) {
      setMetrics(cachedData);
      setLoading(false);
      return;
    }
    
    // Si no hay cache válido, hacer fetch
    fetchMetrics();
  }, []);

  const fetchMetrics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setCacheUsed(false);
      
      console.log('🔄 Iniciando fetch de métricas...');
      
      // ✅ OPTIMIZACIÓN 1: Solo estudiantes activos + conteo total
      const [
        activeStudentsSnapshot,
        totalStudentsCount,
        recentSessionsSnapshot,
        recentPaymentsSnapshot,
        plansSnapshot
      ] = await Promise.all([
        // Solo estudiantes activos para procesar datos detallados
        getDocs(query(
          collection(db, 'students'),
          where('membresia.estado', '==', 'activa'),
          limit(100) // Límite de seguridad
        )),
        
        // ✅ OPTIMIZACIÓN 2: Conteo total sin traer todos los docs
        getCountFromServer(collection(db, 'students')),
        
        // ✅ Solo sesiones recientes (últimos 30 días)
        getDocs(query(
          collection(db, 'sessions'),
          where('checkInTimestamp', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          limit(200)
        )),
        
        // ✅ Solo pagos recientes (últimos 30 días)
        getDocs(query(
          collection(db, 'payments'),
          where('date', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          limit(200)
        )),
        
        // Planes (pocos, no necesita optimización)
        getDocs(collection(db, 'plans'))
      ]);

      console.log('✅ Datos obtenidos:', {
        'Estudiantes activos': activeStudentsSnapshot.size,
        'Total estudiantes': totalStudentsCount.data().count,
        'Sesiones recientes': recentSessionsSnapshot.size,
        'Pagos recientes': recentPaymentsSnapshot.size,
        'Planes': plansSnapshot.size
      });

      // ✅ OPTIMIZACIÓN 3: Obtener conteos adicionales de forma eficiente
      const [pendingStudentsCount, unpaidStudentsCount] = await Promise.all([
        getCountFromServer(query(
          collection(db, 'students'),
          where('membresia.estado', '==', 'pendiente')
        )),
        getCountFromServer(query(
          collection(db, 'students'),
          where('membresia.estado', '==', 'inactiva')
        ))
      ]);

      // Procesar datos
      const activeStudents = activeStudentsSnapshot.docs.map(doc => doc.data());
      const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
      
      const studentMetrics = processStudentMetrics(
        activeStudents, 
        plans, 
        totalStudentsCount.data().count,
        pendingStudentsCount.data().count,
        unpaidStudentsCount.data().count
      );
      
      const sessionMetrics = processSessionMetrics(recentSessionsSnapshot.docs.map(doc => doc.data()));
      const paymentMetrics = processPaymentMetrics(recentPaymentsSnapshot.docs.map(doc => doc.data()));
      const planMetrics = processPlanMetrics(plans, activeStudents);

      const newMetrics = {
        students: studentMetrics,
        sessions: sessionMetrics,
        payments: paymentMetrics,
        plans: planMetrics,
        lastUpdate: Date.now(),
        cacheExpiry: Date.now() + CACHE_DURATION
      };

      setMetrics(newMetrics);
      
      // ✅ Guardar en cache
      saveToCache(newMetrics);

    } catch (error) {
      console.error('❌ Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Procesar métricas de estudiantes con datos limitados
  const processStudentMetrics = (
    activeStudents: any[], 
    plans: Plan[], 
    totalCount: number,
    pendingCount: number,
    unpaidCount: number
  ) => {
    let alumnosRegulares = 0;
    let presentados = 0;
    let noPresentados = 0;
    const planDistribution: { [planName: string]: number } = {};

    // Inicializar distribución de planes
    plans.forEach(plan => {
      planDistribution[plan.name] = 0;
    });

    // Solo procesar estudiantes activos
    activeStudents.forEach(student => {
      // Tipos de estudiante (certificado)
      const certificado = student.certificado;
      
      if (certificado === true) {
        alumnosRegulares++;
        presentados++;
      } else if (certificado === null || certificado === false) {
        noPresentados++;
      }

      // Distribución de planes
      const planName = student.plan || student.membresia?.nombre;
      if (planName && planDistribution.hasOwnProperty(planName)) {
        planDistribution[planName]++;
      }
    });

    return {
      total: totalCount,
      activos: activeStudents.length,
      pendientes: pendingCount,
      noPagados: unpaidCount,
      alumnosRegulares,
      presentados,
      noPresentados,
      planDistribution
    };
  };

  const processSessionMetrics = (sessions: any[]) => {
    const total = sessions.length;
    const hoy = new Date().toDateString();
    
    const enCowork = sessions.filter(session => !session.checkOutTimestamp).length;
    
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
    const total = payments.length;
    const hoy = new Date().toISOString().split('T')[0];
    
    let hoyTotal = 0;
    let pendientes = 0;
    
    const mediosPago: { [medio: string]: number } = {};
    paymentMethods.forEach(method => {
      mediosPago[method] = 0;
    });

    payments.forEach((payment) => {      
      if (payment.date && payment.date === hoy) {
        const amount = payment.amount || payment.monto || 0;
        hoyTotal += amount;
      }

      if (payment.facturado === false || payment.estado === 'pendiente') {
        pendientes++;
      }

      const posiblesCampos = [
        payment.method,
        payment.medioPago,
        payment.medoPago, 
        payment.metodo,
        payment.paymentMethod,
        payment.tipo,
        payment.medio
      ];

      let medio = posiblesCampos.find(campo => campo != null) || 'Efectivo';
      
      if (mediosPago.hasOwnProperty(medio)) {
        mediosPago[medio]++;
      } else {
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

  const processPlanMetrics = (plans: Plan[], activeStudents: any[]) => {
    const total = plans.length;
    
    const planUsage: { [planName: string]: number } = {};
    activeStudents.forEach(student => {
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
      // Limpiar cache al hacer logout
      localStorage.removeItem(CACHE_KEY);
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const handleForceRefresh = () => {
    console.log('🔄 Forzando actualización...');
    localStorage.removeItem(CACHE_KEY);
    fetchMetrics(true);
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
          <p className="text-gray-600 font-medium">
            {cacheUsed ? 'Cargando desde cache...' : 'Cargando métricas optimizadas...'}
          </p>
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
            <p className="text-gray-600 flex items-center space-x-2">
              <span>Vista general del coworking</span>
              {cacheUsed && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  📱 Cache activo
                </span>
              )}
              {metrics.lastUpdate > 0 && (
                <span className="text-xs text-gray-500">
                  Actualizado: {new Date(metrics.lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </p>
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
            onClick={() => navigate('students')}
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
            onClick={() => navigate('sessions')}
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
            onClick={() => navigate('payments')}
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
            onClick={() => navigate('plans')}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          >
            <MetricItem label="Total" value={metrics.plans.total} />
            <MetricItem label="Más usado" value={metrics.plans.masUsado} />
          </DashboardCard>

          {/* Estadísticas */}
          <DashboardCard
            title="Estadísticas"
            icon={<BarChart3 className="text-white" size={24} />}
            onClick={() => navigate('stats')}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          >
            <MetricItem label="Ver reportes" value="detallados" />
            <MetricItem label="Análisis" value="completo" />
          </DashboardCard>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mt-8 space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchMetrics()}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Actualizar (desde cache si es posible)</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleForceRefresh}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Forzar actualización</span>
          </motion.button>
        </div>

        {/* Cache Info */}
        {metrics.lastUpdate > 0 && (
          <div className="text-center mt-4 text-sm text-gray-500">
            Cache válido hasta: {new Date(metrics.cacheExpiry).toLocaleString()}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;