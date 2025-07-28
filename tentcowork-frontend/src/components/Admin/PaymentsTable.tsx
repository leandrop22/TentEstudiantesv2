import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../utils/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  CreditCard, 
  Search, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit2, 
  Save, 
  X,
  Filter,
  User,
  Calendar,
  DollarSign,
  Download,
  EyeOff,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  Sun,
  CalendarDays,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Payment {
  id: string;
  fullName: string;
  amount: number;
  method: string;
  date: string;
  facturado: boolean;
  plan: string;
  studentId?: string;
}

interface Student {
  id: string;
  fullName: string;
  plan: string;
  email: string;
  phone: string;
  carrera: string;
  faculty: string;
  university: string;
  accessCode: string;
  activo: boolean;
  certificado: boolean;
  isCheckedIn: boolean;
  fotoURL: string;
  createdAt: any;
  lastCheckInTimestamp: any;
  membresia: {
    medioPago: string;
    montoPagado: number;
    nombre?: string;
    estado?: string;
    fechaDesde?: Timestamp;
    fechaHasta?: Timestamp;
  };
}

const SUPER_ADMINS = ['leandropetricca123@gmail.com'];
const currentUserEmail = 'leandropetricca123@gmail.com';
const isSuperAdmin = SUPER_ADMINS.includes(currentUserEmail);

const PaymentsTable: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Payment>>({});
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // ✅ Cambio: por defecto oculto
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ Cambio: Filtros por defecto - solo pagos de hoy
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    name: '',
    plan: '',
    amount: '',
    paymentMethod: '',
    date: today, // ✅ Por defecto: fecha de hoy
    facturado: 'all' as 'all' | 'true' | 'false',
    dateRange: 'today' as 'today' | 'week' | 'month' | 'all' // ✅ Nuevo filtro rápido
  });

  const [newPayment, setNewPayment] = useState({
    fullName: '',
    amount: 0,
    method: '',
    date: today,
    facturado: false,
    plan: '',
    studentId: '',
  });

  const paymentMethods = ['Efectivo', 'Mercado Pago Transferencia', 'Mercado Pago Posnet','Mercado Pago Hospedado'];

  // ✅ Función optimizada: Detectar si es pase diario
  const isPaseDiario = (planName: string, price: number = 0) => {
    const nombre = planName.toLowerCase();
    return nombre.includes('diario') || 
           nombre.includes('día') || 
           nombre.includes('day') ||
           (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
           price <= 8000;
  };

  // ✅ Función optimizada: Calcular fechas según tipo de plan
  const calcularFechasPlan = (planName: string, price: number, fechaPago: Date) => {
    const fechaDesde = new Date(fechaPago);
    let fechaHasta: Date;

    if (isPaseDiario(planName, price)) {
      // Para pase diario: hasta las 23:59:59 del mismo día
      fechaHasta = new Date(fechaPago);
      fechaHasta.setHours(23, 59, 59, 999);
    } else {
      // Para planes mensuales: 30 días después
      fechaHasta = new Date(fechaPago);
      fechaHasta.setDate(fechaHasta.getDate() + 30);
    }

    return {
      fechaDesde: Timestamp.fromDate(fechaDesde),
      fechaHasta: Timestamp.fromDate(fechaHasta)
    };
  };

  // ✅ Nueva función: Verificar estado de vigencia
  const getVigenciaStatus = (planName: string, price: number, fechaPago: string) => {
    const plan = plans.find(p => p.name === planName);
    const esDiario = isPaseDiario(planName, price);
    const fechaPagoDate = new Date(fechaPago + 'T12:00:00');
    const now = new Date();
    
    let fechaVencimiento: Date;
    
    if (esDiario) {
      fechaVencimiento = new Date(fechaPagoDate);
      fechaVencimiento.setHours(23, 59, 59, 999);
    } else {
      fechaVencimiento = new Date(fechaPagoDate);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    }
    
    const isVencido = now > fechaVencimiento;
    const horasRestantes = Math.max(0, (fechaVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    return {
      esDiario,
      isVencido,
      fechaVencimiento,
      horasRestantes,
      status: isVencido ? 'vencido' : (horasRestantes < 24 && !esDiario ? 'por-vencer' : 'vigente')
    };
  };

  // ✅ Función optimizada: Obtener información del plan seleccionado
  const getSelectedPlanInfo = () => {
    if (!newPayment.plan) return null;
    
    const selectedPlan = plans.find(p => p.name === newPayment.plan);
    if (!selectedPlan) return null;
    
    const esDiario = isPaseDiario(selectedPlan.name, selectedPlan.price);
    return {
      plan: selectedPlan,
      esDiario,
      vigencia: esDiario ? 'hasta las 23:59 del día' : '30 días desde el pago'
    };
  };

  // ✅ Filtros optimizados con useMemo
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Filtros de texto
      const matchesName = payment.fullName.toLowerCase().includes(filters.name.toLowerCase());
      const matchesPlan = payment.plan.toLowerCase().includes(filters.plan.toLowerCase());
      const matchesAmount = filters.amount === '' || payment.amount.toString().includes(filters.amount);
      const matchesMethod = payment.method.toLowerCase().includes(filters.paymentMethod.toLowerCase());
      const matchesFacturado = filters.facturado === 'all' || 
        (filters.facturado === 'true' && payment.facturado) ||
        (filters.facturado === 'false' && !payment.facturado);

      // ✅ Filtro de fecha optimizado
      let matchesDate = true;
      const paymentDate = new Date(payment.date);
      const today = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          matchesDate = payment.date === today.toISOString().split('T')[0];
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = paymentDate >= weekAgo && paymentDate <= today;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = paymentDate >= monthAgo && paymentDate <= today;
          break;
        case 'all':
          matchesDate = filters.date === '' || payment.date.includes(filters.date);
          break;
      }

      return matchesName && matchesPlan && matchesAmount && matchesMethod && matchesDate && matchesFacturado;
    });
  }, [payments, filters]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchPayments(), fetchStudents(), fetchPlans()]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchPayments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'payments'));
      const paymentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data.fullName || '',
          amount: data.amount || 0,
          method: data.method || '',
          date: data.date || '',
          facturado: data.facturado || false,
          plan: data.plan || '',
          studentId: data.studentId || '',
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // ✅ Ordenar por fecha descendente
      
      setPayments(paymentsData);
    } catch (error: any) {
      console.error("Error fetching payments: ", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data.fullName || '',
          plan: data.plan || '',
          email: data.email || '',
          phone: data.phone || '',
          carrera: data.carrera || '',
          faculty: data.faculty || '',
          university: data.university || '',
          accessCode: data.accessCode || '',
          activo: data.activo || false,
          certificado: data.certificado || false,
          isCheckedIn: data.isCheckedIn || false,
          fotoURL: data.fotoURL || '',
          createdAt: data.createdAt || null,
          lastCheckInTimestamp: data.lastCheckInTimestamp || null,
          membresia: {
            medioPago: data.membresia?.medioPago || '',
            montoPagado: data.membresia?.montoPagado || 0,
            nombre: data.membresia?.nombre || '',
            estado: data.membresia?.estado || '',
            fechaDesde: data.membresia?.fechaDesde || null,
            fechaHasta: data.membresia?.fechaHasta || null,
          },
        };
      });
      setStudents(studentsData);
    } catch (error: any) {
      console.error("Error fetching students: ", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'plans'));
      const plansData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          description: data.description || '',
        };
      });
      setPlans(plansData);
      
      if (plansData.length === 0) {
        /* console.log('⚠️ NO SE ENCONTRARON PLANES en la colección "plans"'); */

      }
    } catch (error: any) {
      console.error("Error fetching plans: ", error);
    }
  };

  const searchStudents = (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowStudentDropdown(false);
      return;
    }
    
    const results = students.filter(student =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // ✅ Limitar resultados
    
    setSearchResults(results);
    setShowStudentDropdown(true);
  };

  const selectStudent = (student: Student) => {
    const currentPlan = student.plan || '';
    const studentPlan = plans.find(plan => plan.name === currentPlan);
    
    const updatedPayment = {
      ...newPayment,
      fullName: student.fullName,
      plan: currentPlan,
      amount: studentPlan?.price || 0,
      studentId: student.id,
    };
    
    setNewPayment(updatedPayment);
    setShowStudentDropdown(false);
  };

  const handlePlanChange = (planName: string) => {
    const selectedPlan = plans.find(plan => plan.name === planName);
    setNewPayment({
      ...newPayment,
      plan: planName,
      amount: selectedPlan?.price || 0,
    });
  };

  const handleAddPayment = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validaciones
      if (!newPayment.fullName || !newPayment.plan || !newPayment.method || newPayment.amount <= 0 || !newPayment.studentId) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }

      const paymentData = {
        fullName: newPayment.fullName,
        amount: newPayment.amount,
        method: newPayment.method,
        date: newPayment.date,
        facturado: newPayment.facturado,
        plan: newPayment.plan,
        studentId: newPayment.studentId,
      };

      // Agregar el pago
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      
      // Actualizar el plan del estudiante
      const studentRef = doc(db, 'students', newPayment.studentId);
      
      try {
        const fechaPago = new Date(newPayment.date + 'T12:00:00');
        const selectedPlan = plans.find(p => p.name === newPayment.plan);
        const { fechaDesde, fechaHasta } = calcularFechasPlan(
          newPayment.plan, 
          selectedPlan?.price || 0, 
          fechaPago
        );
        
        const updateData: any = {
          plan: newPayment.plan,
          'membresia.nombre': newPayment.plan,
          'membresia.estado': 'activa',
          'membresia.montoPagado': newPayment.amount,
          'membresia.medioPago': newPayment.method,
          'membresia.fechaDesde': fechaDesde,
          'membresia.fechaHasta': fechaHasta,
          activo: true
        };
        
        await updateDoc(studentRef, updateData);
      } catch (updateError: any) {
        console.error('Error al actualizar el estudiante:', updateError);
        alert('El pago se agregó pero no se pudo actualizar el plan del estudiante.');
      }
      
      // Reset form
      setNewPayment({
        fullName: '',
        amount: 0,
        method: '',
        date: today,
        facturado: false,
        plan: '',
        studentId: '',
      });
      setIsModalOpen(false);
      
      // Refrescar datos
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
      }, 1000);
      
      const planInfo = getSelectedPlanInfo();
      const tipoMensaje = planInfo?.esDiario 
        ? `Pago agregado. Membresía activa hasta las 23:59 de hoy.`
        : `Pago agregado. Membresía activa por 30 días.`;
      
      alert(`✅ ${tipoMensaje}`);
    } catch (error: any) {
      console.error('Error al agregar pago:', error);
      alert('Error al agregar el pago: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (payment: Payment) => {
    setEditingPayment(payment.id);
    setEditingData({
      fullName: payment.fullName,
      amount: payment.amount,
      method: payment.method,
      date: payment.date,
      facturado: payment.facturado,
      plan: payment.plan,
    });
  };

  const cancelEditing = () => {
    setEditingPayment(null);
    setEditingData({});
  };

  const saveEditing = async () => {
    if (!editingPayment) return;
    
    try {
      const updateData: Partial<Payment> = {};
      if (editingData.fullName !== undefined) updateData.fullName = editingData.fullName;
      if (editingData.amount !== undefined) updateData.amount = editingData.amount;
      if (editingData.method !== undefined) updateData.method = editingData.method;
      if (editingData.date !== undefined) updateData.date = editingData.date;
      if (editingData.facturado !== undefined) updateData.facturado = editingData.facturado;
      if (editingData.plan !== undefined) updateData.plan = editingData.plan;

      await updateDoc(doc(db, 'payments', editingPayment), updateData);
      
      // Actualizar estudiante si es necesario
      const payment = payments.find(p => p.id === editingPayment);
      if (payment && payment.studentId) {
        const needsStudentUpdate = 
          (editingData.plan && editingData.plan !== payment.plan) ||
          (editingData.amount && editingData.amount !== payment.amount) ||
          (editingData.method && editingData.method !== payment.method) ||
          (editingData.date && editingData.date !== payment.date);
        
        if (needsStudentUpdate) {
          try {
            const fechaPago = new Date(editingData.date || payment.date);
            const planName = editingData.plan || payment.plan;
            const amount = editingData.amount || payment.amount;
            
            const { fechaDesde, fechaHasta } = calcularFechasPlan(planName, amount, fechaPago);
            
            const studentUpdateData: any = { activo: true };
            
            if (editingData.plan !== undefined) {
              studentUpdateData.plan = editingData.plan;
              studentUpdateData['membresia.nombre'] = editingData.plan;
              studentUpdateData['membresia.estado'] = 'activa';
            }
            
            if (editingData.amount !== undefined) {
              studentUpdateData['membresia.montoPagado'] = editingData.amount;
            }
            
            if (editingData.method !== undefined) {
              studentUpdateData['membresia.medioPago'] = editingData.method;
            }
            
            if (editingData.date !== undefined || editingData.plan !== undefined) {
              studentUpdateData['membresia.fechaDesde'] = fechaDesde;
              studentUpdateData['membresia.fechaHasta'] = fechaHasta;
            }
            
            await updateDoc(doc(db, 'students', payment.studentId), studentUpdateData);
          } catch (studentUpdateError: any) {
            console.error('Error al actualizar plan del estudiante:', studentUpdateError);
            alert('El pago se actualizó pero no se pudo actualizar el plan del estudiante.');
          }
        }
      }
      
      setEditingPayment(null);
      setEditingData({});
      
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
      }, 1000);
      
      alert('✅ Pago actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating payment:', error);
      alert('Error al actualizar el pago: ' + error.message);
    }
  };

  const toggleFacturado = async (paymentId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        facturado: !currentStatus
      });
      await fetchPayments();
    } catch (error: any) {
      console.error("Error updating facturado status: ", error);
      alert('Error al actualizar el estado: ' + error.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const paymentToDelete = payments.find(p => p.id === paymentId);
      if (!paymentToDelete) {
        alert('No se encontró el pago a eliminar');
        return;
      }
      
      await deleteDoc(doc(db, 'payments', paymentId));
      
      if (paymentToDelete.studentId) {
        try {
          const studentRef = doc(db, 'students', paymentToDelete.studentId);
          const studentDoc = await getDoc(studentRef);
          
          if (studentDoc.exists()) {
            const updateData = {
              plan: '',
              'membresia.nombre': '',
              'membresia.estado': 'pendiente',
              'membresia.montoPagado': 0,
              'membresia.medioPago': '',
              'membresia.fechaDesde': null,
              'membresia.fechaHasta': null,
              activo: false
            };
            
            await updateDoc(studentRef, updateData);
          }
        } catch (updateError: any) {
          console.error('Error al actualizar membresía del estudiante:', updateError);
        }
      }
      
      setPayments(prev => prev.filter(payment => payment.id !== paymentId));
      setShowDeleteConfirm(null);
      
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
      }, 1000);
      
      alert('✅ Pago eliminado exitosamente');
    } catch (error: any) {
      console.error('Error al eliminar pago:', error);
      alert('Error al eliminar el pago: ' + error.message);
    }
  };

  const exportToExcel = () => {
    try {
      const dataToExport = filteredPayments.map(payment => {
        const plan = plans.find(p => p.name === payment.plan);
        const vigenciaInfo = getVigenciaStatus(payment.plan, payment.amount, payment.date);
        
        return {
          'Estudiante': payment.fullName,
          'Plan': payment.plan,
          'Tipo': vigenciaInfo.esDiario ? 'Pase Diario' : 'Plan Mensual',
          'Monto': payment.amount,
          'Método de Pago': payment.method,
          'Fecha': payment.date,
          'Estado Vigencia': vigenciaInfo.isVencido ? 'Vencido' : 'Vigente',
          'Vencimiento': vigenciaInfo.fechaVencimiento.toLocaleDateString(),
          'Estado': payment.facturado ? 'Facturado' : 'Pendiente'
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      const colWidths = [
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, 
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

      const fileName = `Pagos_${today}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error: any) {
      console.error('Error al exportar a Excel:', error);
    }
  };

  // ✅ Componente optimizado de vigencia
  const VigenciaStatus = ({ planName, amount, date }: { planName: string; amount: number; date: string }) => {
    const vigenciaInfo = getVigenciaStatus(planName, amount, date);
    
    const getStatusColor = () => {
      switch (vigenciaInfo.status) {
        case 'vencido':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'por-vencer':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        default:
          return vigenciaInfo.esDiario 
            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
            : 'bg-green-100 text-green-800 border-green-300';
      }
    };

    const getStatusText = () => {
      if (vigenciaInfo.isVencido) {
        return 'Vencido';
      }
      
      if (vigenciaInfo.esDiario) {
        const horasRestantes = Math.floor(vigenciaInfo.horasRestantes);
        const minutosRestantes = Math.floor((vigenciaInfo.horasRestantes % 1) * 60);
        
        if (horasRestantes > 0) {
          return `${horasRestantes}h ${minutosRestantes}m`;
        } else {
          return `${minutosRestantes}m`;
        }
      } else {
        const diasRestantes = Math.floor(vigenciaInfo.horasRestantes / 24);
        return `${diasRestantes} días`;
      }
    };

    return (
      <div className="flex flex-col space-y-1">
        <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getStatusColor()}`}>
          {vigenciaInfo.esDiario ? '☀️' : '📅'} {getStatusText()}
        </span>
        {vigenciaInfo.status === 'por-vencer' && (
          <span className="text-xs text-orange-600 flex items-center">
            <AlertCircle size={10} className="mr-1" />
            Por vencer
          </span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <RefreshCw className="animate-spin text-tent-orange" size={24} />
            <span className="text-gray-600">Cargando pagos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header optimizado */}
      <div className="bg-tent-orange text-white p-6 rounded-t-xl mb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CreditCard size={24} />
            <div>
              <h2 className="text-xl font-bold">Gestión de Pagos</h2>
              <p className="text-orange-100 text-sm">
                {filters.dateRange === 'today' ? 'Pagos de hoy' : 
                 filters.dateRange === 'week' ? 'Última semana' :
                 filters.dateRange === 'month' ? 'Último mes' : 'Todos los pagos'} • {filteredPayments.length} registros
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* ✅ Filtros rápidos */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
              {(['today', 'week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setFilters({ ...filters, dateRange: range, date: range === 'today' ? today : '' })}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filters.dateRange === range 
                      ? 'bg-white text-tent-orange font-medium' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {range === 'today' ? 'Hoy' : 
                   range === 'week' ? 'Semana' :
                   range === 'month' ? 'Mes' : 'Todo'}
                </button>
              ))}
            </div>
            
            <button
              onClick={exportToExcel}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download size={16} />
              <span>Exportar</span>
            </button>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {showFilters ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>Filtros</span>
            </button>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus size={20} />
              <span>Nuevo Pago</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros avanzados */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-x border-b border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="text-gray-500" size={20} />
                <h3 className="text-sm font-medium text-gray-700">Filtros Avanzados</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Filtrar por plan..."
                  value={filters.plan}
                  onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Filtrar por monto..."
                  value={filters.amount}
                  onChange={(e) => setFilters({ ...filters, amount: e.target.value })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                />

                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                >
                  <option value="">Todos los métodos</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value, dateRange: 'all' })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                />

                <select
                  value={filters.facturado}
                  onChange={(e) => setFilters({ ...filters, facturado: e.target.value as 'all' | 'true' | 'false' })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="true">Facturados</option>
                  <option value="false">No facturados</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla optimizada */}
      <div className={`bg-white border-x border-gray-200 ${showFilters ? '' : 'rounded-b-xl border-b'}`}>
        <div className="p-1">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-tent-green">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>Estudiante</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <DollarSign size={14} />
                      <span>Monto</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>Fecha</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>Vigencia</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <Calendar className="text-gray-400" size={48} />
                        <div>
                          <p className="text-gray-500 font-medium">No hay pagos para mostrar</p>
                          <p className="text-gray-400 text-sm">
                            {filters.dateRange === 'today' 
                              ? 'No se encontraron pagos para el día de hoy'
                              : 'No se encontraron pagos que coincidan con los filtros aplicados'
                            }
                          </p>
                        </div>
                        {filters.dateRange === 'today' && (
                          <button
                            onClick={() => setFilters({ ...filters, dateRange: 'all', date: '' })}
                            className="text-tent-orange hover:text-tent-orange/80 font-medium"
                          >
                            Ver todos los pagos
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {editingPayment === payment.id ? (
                          <input
                            type="text"
                            value={editingData.fullName || ''}
                            onChange={(e) => setEditingData({...editingData, fullName: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-tent-orange"
                          />
                        ) : (
                          payment.fullName
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingPayment === payment.id ? (
                          <select
                            value={editingData.plan || ''}
                            onChange={(e) => {
                              const selectedPlan = plans.find(p => p.name === e.target.value);
                              setEditingData({
                                ...editingData, 
                                plan: e.target.value,
                                amount: selectedPlan?.price || editingData.amount || 0
                              });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-tent-orange"
                          >
                            <option value="">Seleccionar plan</option>
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.name}>{plan.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-tent-orange/10 text-tent-orange rounded-full">
                            {payment.plan}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {editingPayment === payment.id ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              value={editingData.amount || 0}
                              onChange={(e) => setEditingData({...editingData, amount: Number(e.target.value)})}
                              className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-tent-orange"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        ) : (
                          `${payment.amount.toLocaleString()}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingPayment === payment.id ? (
                          <select
                            value={editingData.method || ''}
                            onChange={(e) => setEditingData({...editingData, method: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-tent-orange"
                          >
                            <option value="">Seleccionar método</option>
                            {paymentMethods.map(method => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        ) : (
                          payment.method
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingPayment === payment.id ? (
                          <input
                            type="date"
                            value={editingData.date || ''}
                            onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-tent-orange"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span>{payment.date}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(payment.date).toLocaleDateString('es-AR', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <VigenciaStatus 
                          planName={payment.plan} 
                          amount={payment.amount} 
                          date={payment.date} 
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => toggleFacturado(payment.id, payment.facturado)}
                          className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer p-1 rounded"
                        >
                          {payment.facturado ? (
                            <>
                              <CheckCircle className="text-tent-green" size={16} />
                              <span className="text-tent-green font-medium">Facturado</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="text-red-500" size={16} />
                              <span className="text-red-500 font-medium">Pendiente</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {editingPayment === payment.id ? (
                            <>
                              <button
                                onClick={saveEditing}
                                className="text-tent-green hover:text-tent-green/80 transition-colors p-1 rounded"
                                title="Guardar cambios"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-500 hover:text-red-500/80 transition-colors p-1 rounded"
                                title="Cancelar edición"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            
                            <>
                            { /*
                              <button
                                onClick={() => startEditing(payment)}
                                className="text-tent-orange hover:text-tent-orange/80 transition-colors p-1 rounded"
                                title="Editar pago"
                              >
                                <Edit2 size={16} />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setShowDeleteConfirm(payment.id)}
                                  className="text-red-500 hover:text-red-600 transition-colors p-1 rounded"
                                  title="Eliminar pago (Solo Super-Admin)"
                                >
                                  <Trash2 size={16} />
                                </button>
                            )}
                                 */  }
                              
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para agregar pago */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Agregar Nuevo Pago</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Búsqueda de estudiante */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar Estudiante
                  </label>
                  <input
                    type="text"
                    placeholder="Escribir nombre del estudiante..."
                    value={newPayment.fullName}
                    onChange={(e) => {
                      setNewPayment({ ...newPayment, fullName: e.target.value });
                      searchStudents(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                  />
                  
                  {showStudentDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {searchResults.map(student => (
                        <button
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                        >
                          <span>{student.fullName}</span>
                          <span className="text-sm text-gray-500">{student.plan || 'Sin plan'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan
                  </label>
                  <select
                    value={newPayment.plan}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                  >
                    <option value="">Seleccionar plan</option>
                    {plans.map(plan => {
                      const esDiario = isPaseDiario(plan.name, plan.price);
                      return (
                        <option key={plan.id} value={plan.name}>
                          {plan.name} - ${plan.price.toLocaleString()} {esDiario ? '(Diario)' : '(Mensual)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Información del plan seleccionado */}
                {getSelectedPlanInfo() && (
                  <div className={`p-3 rounded-lg border ${
                    getSelectedPlanInfo()?.esDiario
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {getSelectedPlanInfo()?.esDiario ? (
                        <Sun size={16} className="text-yellow-600 mt-0.5" />
                      ) : (
                        <CalendarDays size={16} className="text-blue-600 mt-0.5" />
                      )}
                      <div className="text-sm">
                        <p className={`font-medium ${
                          getSelectedPlanInfo()?.esDiario ? 'text-yellow-800' : 'text-blue-800'
                        }`}>
                          {getSelectedPlanInfo()?.esDiario ? 'Pase Diario' : 'Plan Mensual'}
                        </p>
                        <p className={`${
                          getSelectedPlanInfo()?.esDiario ? 'text-yellow-700' : 'text-blue-700'
                        }`}>
                          Vigencia: {getSelectedPlanInfo()?.vigencia}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {newPayment.plan && (
                    <p className="text-xs text-gray-500 mt-1">
                      Precio sugerido del plan: ${plans.find(p => p.name === newPayment.plan)?.price.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                  >
                    <option value="">Seleccionar método</option>
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha del Pago
                  </label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tent-orange focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getSelectedPlanInfo()?.esDiario 
                      ? 'Para pases diarios: vigencia hasta las 23:59 de esta fecha'
                      : 'Esta fecha será el inicio de la vigencia del plan (30 días desde esta fecha)'
                    }
                  </p>
                </div>

                {/* Facturado */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="facturado"
                    checked={newPayment.facturado}
                    onChange={(e) => setNewPayment({ ...newPayment, facturado: e.target.checked })}
                    className="w-4 h-4 text-tent-orange focus:ring-tent-orange border-gray-300 rounded"
                  />
                  <label htmlFor="facturado" className="text-sm font-medium text-gray-700">
                    Pago facturado
                  </label>
                </div>

                {/* Botones */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setNewPayment({
                        fullName: '',
                        amount: 0,
                        method: '',
                        date: today,
                        facturado: false,
                        plan: '',
                        studentId: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={!newPayment.fullName || !newPayment.plan || !newPayment.method || newPayment.amount <= 0 || isSubmitting}
                    className="flex-1 px-4 py-2 bg-tent-orange text-white rounded-lg hover:bg-tent-orange/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <span>Agregar Pago</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación para eliminar */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                  <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="text-red-500" size={16} />
                  <span className="text-sm font-medium text-red-800">
                    ¿Está seguro que desea eliminar este pago?
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  Se eliminará permanentemente el registro del pago y la membresía del estudiante será actualizada.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={() => handleDeletePayment(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Eliminar Pago</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PaymentsTable;