import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import StudentsTable from './StudentsTable';
import PaymentsTable from './PaymentsTable';
import SessionsTable from './SessionsTable';
import EstadisticasAdmin from './EstadisticasAdmin';
import PlansEditor from './PlansEditor';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Plan } from '../../types/Plan';

const AdminInfo: React.FC = () => {
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

  if (!user) {
    return null; // O puedes devolver un componente de carga
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="flex items-center space-x-2 mx-auto px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </motion.button>
        
        <StudentsTable />
        <SessionsTable />
        <PaymentsTable />
        <PlansEditor
          plans={plans}
          formData={formData}
          setFormData={setFormData}
          editingId={editingId}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
        <EstadisticasAdmin />
      </motion.div>
    </div>
  );
};

export default AdminInfo;