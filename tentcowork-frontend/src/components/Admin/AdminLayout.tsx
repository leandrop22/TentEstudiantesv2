 import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, Home } from 'lucide-react';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Plan } from '../../types/Plan';

// Importar tus componentes existentes
import StudentsTable from './StudentsTable';
import PaymentsTable from './PaymentsTable';
import SessionsTable from './SessionsTable';
import EstadisticasAdmin from './EstadisticasAdmin';
import PlansEditor from './PlansEditor';
import AdminDashboard from './AdminDashboard'; 

const AdminLayout: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState<Plan>({
    id: '',
    name: '',
    price: 0,
    days: '',
    startHour: '',
    endHour: '',
    description: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const uid = user.uid;
        const adminRef = doc(db, 'admin', uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          setUser(user);
          await fetchPlans();
        } else {
          await signOut(auth);
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchPlans = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'plans'));
      const plansData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[];
      setPlans(plansData);
    } catch (error) {
      console.error("Error fetching plans: ", error);
    }
  };

  const checkStudentsUsingPlan = async (planId: string): Promise<number> => {
    try {
    

      // Primero, obtener el nombre del plan basado en el ID
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        /* console.log('❌ Plan no encontrado'); */

        return 0;
      }

      /* console.log('Plan encontrado:', plan.name); */


      const studentsRef = collection(db, 'students');
      let totalCount = 0;

      // Búsqueda 1: Por campo 'plan' directo (string)
      /* console.log('🔍 Buscando por campo plan =', plan.name); */

      let q = query(studentsRef, where('plan', '==', plan.name));
      let snapshot = await getDocs(q);
      totalCount += snapshot.size;
      
      if (snapshot.size > 0) {
        /* console.log(`✅ Encontrados ${snapshot.size} estudiantes con plan="${plan.name}"`); */

        snapshot.docs.forEach(doc => {
          /* console.log(`📍 Estudiante: ${doc.data().fullName || doc.data().name || 'Sin nombre'}`); */

        });
      }

      // Búsqueda 2: Por campo 'membresia.nombre'
      /* console.log('🔍 Buscando por membresia.nombre =', plan.name); */

      q = query(studentsRef, where('membresia.nombre', '==', plan.name));
      snapshot = await getDocs(q);
      
      if (snapshot.size > 0) {
        /* console.log(`✅ Encontrados ${snapshot.size} estudiantes adicionales con membresia.nombre="${plan.name}"`); */

        snapshot.docs.forEach(doc => {
          const studentData = doc.data();
          // Verificar si ya no lo contamos en la búsqueda anterior
          if (studentData.plan !== plan.name) {
            totalCount += 1;
            /* console.log(`📍 Estudiante adicional: ${studentData.fullName || studentData.name || 'Sin nombre'}`); */

          }
        });
      } else {
        /* console.log('ℹ️ No se encontraron estudiantes adicionales por membresia.nombre'); */

      }

      // Búsqueda 3: Verificación exhaustiva para debug
      /* console.log('🔍 Verificación exhaustiva para debug...'); */

      const allStudentsSnapshot = await getDocs(studentsRef);
      let debugCount = 0;
      
      allStudentsSnapshot.docs.forEach(doc => {
        const student = doc.data();
        if (student.plan === plan.name || student.membresia?.nombre === plan.name) {
          debugCount++;
          /* console.log(`🔎 Debug - Estudiante: ${student.fullName || student.name || 'Sin nombre'}, Plan: "${student.plan}", Membresía: "${student.membresia?.nombre}"`); */

        }
      });

     
      
      // Usar el conteo de verificación exhaustiva para mayor precisión
      return debugCount;

    } catch (error) {
      console.error('❌ Error verificando estudiantes:', error);
      return 0;
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Actualizar plan existente
        const planRef = doc(db, 'plans', editingId);
        await updateDoc(planRef, {
          name: formData.name,
          price: formData.price,
          days: formData.days,
          startHour: formData.startHour,
          endHour: formData.endHour,
          description: formData.description
        });
        setEditingId(null);
      } else {
        // Agregar nuevo plan
        await addDoc(collection(db, 'plans'), {
          name: formData.name,
          price: formData.price,
          days: formData.days,
          startHour: formData.startHour,
          endHour: formData.endHour,
          description: formData.description
        });
      }
      
      // Resetear formulario
      setFormData({
        id: '',
        name: '',
        price: 0,
        days: '',
        startHour: '',
        endHour: '',
        description: ''
      });
      
      // Recargar plans
      await fetchPlans();
    } catch (error) {
      console.error("Error saving plan: ", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'plans', id));
      await fetchPlans();
    } catch (error) {
      console.error("Error deleting plan: ", error);
    }
  };

  const handleEdit = (id: string, data: Plan) => {
    setEditingId(id);
    setFormData({
      id: data.id,
      name: data.name,
      price: data.price,
      days: data.days,
      startHour: data.startHour,
      endHour: data.endHour,
      description: data.description
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  // Función para obtener el título de la página actual
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/admin': return 'Dashboard';
      case '/admin/students': return 'Gestión de Estudiantes';
      case '/admin/sessions': return 'Sesiones Activas';
      case '/admin/payments': return 'Gestión de Pagos';
      case '/admin/plans': return 'Editor de Planes';
      case '/admin/stats': return 'Estadísticas y Reportes';
      default: return 'Administración';
    }
  };

  // Componente Header para páginas internas
  const PageHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200"
          >
            <Home size={16} />
            <span>Dashboard</span>
          </motion.button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </motion.button>
      </div>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Routes>
        {/* Dashboard Principal */}
        <Route path="/" element={<AdminDashboard />} />
        
        {/* Páginas individuales con header */}
        <Route path="/students" element={
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <PageHeader title={getPageTitle()} />
              <StudentsTable />
            </motion.div>
          </div>
        } />
        
        <Route path="/sessions" element={
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <PageHeader title={getPageTitle()} />
              <SessionsTable />
            </motion.div>
          </div>
        } />
        
        <Route path="/payments" element={
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <PageHeader title={getPageTitle()} />
              <PaymentsTable />
            </motion.div>
          </div>
        } />
        
        <Route path="/plans" element={
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <PageHeader title={getPageTitle()} />
              <PlansEditor
                plans={plans}
                formData={formData}
                setFormData={setFormData}
                editingId={editingId}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onCheckStudentsUsingPlan={checkStudentsUsingPlan}
              />
            </motion.div>
          </div>
        } />
        
        <Route path="/stats" element={
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <PageHeader title={getPageTitle()} />
              <EstadisticasAdmin />
            </motion.div>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default AdminLayout;