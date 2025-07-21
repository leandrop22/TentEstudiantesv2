import React, { useEffect, useState } from 'react';
import { db } from '../../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, Users, PieChart, TrendingUp } from 'lucide-react';

// Define una interfaz para el tipo de estadísticas
interface Stats {
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  popularPlans: string[];
  activeUsers: number;
  totalUsers: number;
}

const EstadisticasAdmin: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    popularPlans: [],
    activeUsers: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Consulta para obtener pagos
        const paymentsSnapshot = await getDocs(collection(db, 'payments'));
        const payments = paymentsSnapshot.docs.map(doc => doc.data());

        // Consulta para obtener usuarios activos
        const usersSnapshot = await getDocs(collection(db, 'students'));
        const users = usersSnapshot.docs.map(doc => doc.data());

        // Consulta para obtener planes populares
        const plansSnapshot = await getDocs(collection(db, 'plans'));
        const plans = plansSnapshot.docs.map(doc => doc.data());

        // Calcular ingresos mensuales
        const monthlyRevenue = payments
          .filter(payment => new Date(payment.date).getMonth() === new Date().getMonth())
          .reduce((sum, payment) => sum + payment.amount, 0);

        // Calcular ingresos semanales
        const weeklyRevenue = payments
          .filter(payment => {
            const paymentDate = new Date(payment.date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - paymentDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
          })
          .reduce((sum, payment) => sum + payment.amount, 0);

        // Calcular ingresos diarios
        const dailyRevenue = payments
          .filter(payment => new Date(payment.date).toDateString() === new Date().toDateString())
          .reduce((sum, payment) => sum + payment.amount, 0);

        // Obtener planes populares
        const popularPlans = plans
          .sort((a, b) => b.subscriptions - a.subscriptions)
          .slice(0, 3)
          .map(plan => plan.name);

        // Obtener usuarios activos
        const activeUsers = users.filter(user => user.status === 'active').length;

        // Obtener total de usuarios
        const totalUsers = users.length;

        setStats({
          monthlyRevenue,
          weeklyRevenue,
          dailyRevenue,
          popularPlans,
          activeUsers,
          totalUsers,
        });
      } catch (error) {
        console.error("Error fetching stats: ", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Estadísticas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            
            <h3 className="text-xl font-bold text-gray-800">Ingresos Mensuales</h3>
          </div>
          <p className="text-3xl font-bold text-tent-orange mt-4">${stats.monthlyRevenue}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
          
            <h3 className="text-xl font-bold text-gray-800">Ingresos Semanales</h3>
          </div>
          <p className="text-3xl font-bold text-tent-orange mt-4">${stats.weeklyRevenue}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            
            <h3 className="text-xl font-bold text-gray-800">Ingresos Diarios</h3>
          </div>
          <p className="text-3xl font-bold text-tent-orange mt-4">${stats.dailyRevenue}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <PieChart className="text-tent-orange" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Planes Más Contratados</h3>
          </div>
          <p className="text-lg font-medium text-gray-700 mt-4">{stats.popularPlans.join(', ')}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Users className="text-tent-orange" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Usuarios Activos</h3>
          </div>
          <p className="text-3xl font-bold text-tent-orange mt-4">{stats.activeUsers}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Users className="text-tent-orange" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Total de Usuarios</h3>
          </div>
          <p className="text-3xl font-bold text-tent-orange mt-4">{stats.totalUsers}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default EstadisticasAdmin;
