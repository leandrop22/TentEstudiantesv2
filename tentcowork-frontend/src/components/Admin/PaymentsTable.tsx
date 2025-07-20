import React, { useEffect, useState } from 'react';
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
  Info
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

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

const SUPER_ADMINS = [
  'leandropetricca123@gmail.com',
];
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
  const [showFilters, setShowFilters] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState({
    name: '',
    plan: '',
    amount: '',
    paymentMethod: '',
    date: '',
    facturado: 'all' as 'all' | 'true' | 'false',
  });

  const [newPayment, setNewPayment] = useState({
    fullName: '',
    amount: 0,
    method: '',
    date: new Date().toISOString().split('T')[0],
    facturado: false,
    plan: '',
    studentId: '',
  });

  const paymentMethods = ['Efectivo', 'Mercado Pago Transferencia', 'Mercado Pago Posnet','Mercado Pago Hospedado'];

  // ✅ NUEVA FUNCIÓN: Detectar si es pase diario
  const isPaseDiario = (planName: string, price: number = 0) => {
    const nombre = planName.toLowerCase();
    return nombre.includes('diario') || 
           nombre.includes('día') || 
           nombre.includes('day') ||
           (nombre.includes('pase') && (nombre.includes('diario') || nombre.includes('día'))) ||
           price <= 8000;
  };

  // ✅ NUEVA FUNCIÓN: Calcular fechas según tipo de plan
  const calcularFechasPlan = (planName: string, price: number, fechaPago: Date) => {
    let fechaDesde: Date;
    let fechaHasta: Date;

    if (isPaseDiario(planName, price)) {
      // Para pase diario: desde el momento del pago hasta las 23:59:59 del mismo día
      fechaDesde = new Date(fechaPago);
      fechaHasta = new Date(fechaPago);
      fechaHasta.setHours(23, 59, 59, 999); // Hasta las 23:59:59.999
      
      console.log(`📅 Pase Diario: ${planName}`);
      console.log(`⏰ Desde: ${fechaDesde.toLocaleString()}`);
      console.log(`⏰ Hasta: ${fechaHasta.toLocaleString()}`);
    } else {
      // Para planes mensuales: desde la fecha del pago hasta 30 días después
      fechaDesde = new Date(fechaPago);
      fechaHasta = new Date(fechaPago);
      fechaHasta.setDate(fechaHasta.getDate() + 30); // 30 días
      
      console.log(`📅 Plan Mensual: ${planName}`);
      console.log(`⏰ Desde: ${fechaDesde.toLocaleString()}`);
      console.log(`⏰ Hasta: ${fechaHasta.toLocaleString()}`);
    }

    return {
      fechaDesde: Timestamp.fromDate(fechaDesde),
      fechaHasta: Timestamp.fromDate(fechaHasta)
    };
  };

  // ✅ NUEVA FUNCIÓN: Obtener información del tipo de plan seleccionado
  const getSelectedPlanInfo = () => {
    if (!newPayment.plan) return null;
    
    const selectedPlan = plans.find(p => p.name === newPayment.plan);
    if (!selectedPlan) return null;
    
    const esDialo = isPaseDiario(selectedPlan.name, selectedPlan.price);
    return {
      plan: selectedPlan,
      esDiario: esDialo,
      vigencia: esDialo ? 'hasta las 23:59 del día' : '30 días desde el pago'
    };
  };

  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchPlans();
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
      });
      setPayments(paymentsData);
    } catch (error: any) {
      console.error("Error fetching payments: ", error);
    }
  };

  const fetchStudents = async () => {
    try {
      console.log('=== CARGANDO ESTUDIANTES ===');
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Estudiante raw de Firebase:', doc.id, data);
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
      console.log('✅ Estudiantes procesados:', studentsData.length);
    } catch (error: any) {
      console.error("❌ Error fetching students: ", error);
    }
  };

  const fetchPlans = async () => {
    try {
      console.log('=== CARGANDO PLANES ===');
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
      console.log('Planes cargados:', plansData);
      
      if (plansData.length === 0) {
        console.log('⚠️ NO SE ENCONTRARON PLANES en la colección "plans"');
        alert('No hay planes configurados. Por favor, crea planes en la colección "plans" de Firebase.');
      }
    } catch (error: any) {
      console.error("❌ Error fetching plans: ", error);
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
    );
    setSearchResults(results);
    setShowStudentDropdown(true);
  };

  const selectStudent = (student: Student) => {
    console.log('=== ESTUDIANTE SELECCIONADO ===');
    console.log('Estudiante completo:', student);
    console.log('ID:', student.id);
    console.log('Nombre:', student.fullName);
    console.log('Plan actual:', student.plan || 'SIN PLAN');
    
    const currentPlan = student.plan || '';
    const studentPlan = plans.find(plan => plan.name === currentPlan);
    
    console.log('Plan encontrado en lista de planes:', studentPlan);
    
    const updatedPayment = {
      ...newPayment,
      fullName: student.fullName,
      plan: currentPlan,
      amount: studentPlan?.price || 0,
      studentId: student.id,
    };
    
    console.log('Datos actualizados del nuevo pago:', updatedPayment);
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
    if (isSubmitting) {
      console.log('Ya se está procesando un pago...');
      return;
    }

    try {
      setIsSubmitting(true);

      // Validaciones
      if (!newPayment.fullName) {
        alert('Debe seleccionar un estudiante');
        return;
      }
      if (!newPayment.plan) {
        alert('Debe seleccionar un plan');
        return;
      }
      if (!newPayment.method) {
        alert('Debe seleccionar un método de pago');
        return;
      }
      if (newPayment.amount <= 0) {
        alert('El monto debe ser mayor a 0');
        return;
      }
      if (!newPayment.studentId) {
        alert('Error: No se pudo identificar al estudiante. Intente seleccionarlo nuevamente.');
        return;
      }

      const paymentData = {
        fullName: newPayment.fullName,
        amount: newPayment.amount,
        method: newPayment.method,
        date: newPayment.date || new Date().toISOString().split('T')[0],
        facturado: newPayment.facturado,
        plan: newPayment.plan,
        studentId: newPayment.studentId,
      };

      console.log('=== AGREGANDO PAGO ===');
      console.log('Datos del pago:', paymentData);

      // Agregar el pago
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      console.log('✅ Pago agregado con ID:', docRef.id);
      
      // ✅ MEJORADO: Actualizar el plan del estudiante CON FECHAS ESPECÍFICAS SEGÚN TIPO DE PLAN
      console.log('=== ACTUALIZANDO PLAN DEL ESTUDIANTE ===');
      console.log('ID del estudiante:', newPayment.studentId);
      console.log('Nuevo plan:', newPayment.plan);
      
      const studentRef = doc(db, 'students', newPayment.studentId);
      
      try {
        // ✅ CORREGIDO: Manejar fechas correctamente sin problemas de zona horaria
        const fechaPagoString = newPayment.date; // "2025-07-20" formato
        const fechaPago = new Date(fechaPagoString + 'T12:00:00'); // Agregar hora del mediodía
        
        const selectedPlan = plans.find(p => p.name === newPayment.plan);
        const { fechaDesde, fechaHasta } = calcularFechasPlan(
          newPayment.plan, 
          selectedPlan?.price || 0, 
          fechaPago
        );
        
        console.log('Fechas calculadas según tipo de plan:');
        console.log('  - Plan:', newPayment.plan);
        console.log('  - Es pase diario:', isPaseDiario(newPayment.plan, selectedPlan?.price || 0));
        console.log('  - Fecha desde:', fechaDesde.toDate().toISOString());
        console.log('  - Fecha hasta:', fechaHasta.toDate().toISOString());
        console.log('  - Fecha desde (local):', fechaDesde.toDate().toLocaleDateString());
        console.log('  - Fecha hasta (local):', fechaHasta.toDate().toLocaleDateString());
        
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
        
        console.log('Datos de actualización del estudiante:', updateData);
        await updateDoc(studentRef, updateData);
        console.log('✅ Plan y membresía del estudiante actualizados exitosamente');
        
        // Verificar que se actualizó correctamente
        const updatedStudent = await getDoc(studentRef);
        if (updatedStudent.exists()) {
          const data = updatedStudent.data();
          console.log('✅ Verificación - Datos actualizados en Firebase:');
          console.log('  - Plan:', data.plan);
          console.log('  - Membresía:', data.membresia);
          console.log('  - Activo:', data.activo);
        }
        
      } catch (updateError: any) {
        console.error('❌ Error al actualizar el estudiante:', updateError);
        console.error('Código de error:', updateError.code);
        console.error('Mensaje:', updateError.message);
        alert('El pago se agregó pero no se pudo actualizar el plan del estudiante. Error: ' + updateError.message);
      }
      
      // Reset form
      setNewPayment({
        fullName: '',
        amount: 0,
        method: '',
        date: new Date().toISOString().split('T')[0],
        facturado: false,
        plan: '',
        studentId: '',
      });
      setIsModalOpen(false);
      
      // Refrescar datos
      console.log('🔄 Refrescando datos en 2 segundos...');
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
        console.log('✅ Datos refrescados');
      }, 2000);
      
      // ✅ NUEVO: Mensaje específico según tipo de plan
      const planInfo = getSelectedPlanInfo();
      const tipoMensaje = planInfo?.esDiario 
        ? `Pago agregado. Membresía activa hasta las 23:59 de hoy.`
        : `Pago agregado. Membresía activa por 30 días.`;
      
      alert(`✅ ${tipoMensaje}`);
    } catch (error: any) {
      console.error('❌ Error completo al agregar pago:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
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
      console.log('=== GUARDANDO EDICIÓN ===');
      console.log('ID del pago:', editingPayment);
      console.log('Datos a actualizar:', editingData);
      
      const updateData: Partial<Payment> = {};
      if (editingData.fullName !== undefined) updateData.fullName = editingData.fullName;
      if (editingData.amount !== undefined) updateData.amount = editingData.amount;
      if (editingData.method !== undefined) updateData.method = editingData.method;
      if (editingData.date !== undefined) updateData.date = editingData.date;
      if (editingData.facturado !== undefined) updateData.facturado = editingData.facturado;
      if (editingData.plan !== undefined) updateData.plan = editingData.plan;

      console.log('Datos limpiados para actualizar:', updateData);

      await updateDoc(doc(db, 'payments', editingPayment), updateData);
      console.log('✅ Pago actualizado en la base de datos');
      
      // Si cambió plan, fecha o monto, actualizar también el estudiante
      const payment = payments.find(p => p.id === editingPayment);
      console.log('Pago original encontrado:', payment);
      
      if (payment && payment.studentId) {
        const needsStudentUpdate = 
          (editingData.plan && editingData.plan !== payment.plan) ||
          (editingData.amount && editingData.amount !== payment.amount) ||
          (editingData.method && editingData.method !== payment.method) ||
          (editingData.date && editingData.date !== payment.date);
        
        if (needsStudentUpdate) {
          console.log('=== ACTUALIZANDO PLAN DEL ESTUDIANTE ===');
          console.log('Student ID:', payment.studentId);
          
          try {
            // ✅ MEJORADO: Calcular nuevas fechas según el tipo de plan editado
            const fechaPago = new Date(editingData.date || payment.date);
            const planName = editingData.plan || payment.plan;
            const amount = editingData.amount || payment.amount;
            
            const { fechaDesde, fechaHasta } = calcularFechasPlan(planName, amount, fechaPago);
            
            console.log('Nuevas fechas calculadas según tipo de plan:');
            console.log('  - Plan:', planName);
            console.log('  - Es pase diario:', isPaseDiario(planName, amount));
            console.log('  - Fecha desde:', fechaDesde.toDate().toISOString());
            console.log('  - Fecha hasta:', fechaHasta.toDate().toISOString());
            
            const studentUpdateData: any = {
              activo: true
            };
            
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
            
            console.log('Datos de actualización del estudiante:', studentUpdateData);
            await updateDoc(doc(db, 'students', payment.studentId), studentUpdateData);
            console.log('✅ Plan y membresía del estudiante actualizados exitosamente');
          } catch (studentUpdateError: any) {
            console.error('❌ Error al actualizar plan del estudiante:', studentUpdateError);
            alert('El pago se actualizó pero no se pudo actualizar el plan del estudiante: ' + studentUpdateError.message);
          }
        }
      }
      
      setEditingPayment(null);
      setEditingData({});
      
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
        console.log('✅ Datos refrescados');
      }, 2000);
      
      alert('✅ Pago actualizado exitosamente');
    } catch (error: any) {
      console.error('❌ Error updating payment:', error);
      alert('Error al actualizar el pago: ' + error.message);
    }
  };

  const toggleFacturado = async (paymentId: string, currentStatus: boolean) => {
    try {
      console.log('Cambiando estado de facturación:', paymentId, 'de', currentStatus, 'a', !currentStatus);
      
      await updateDoc(doc(db, 'payments', paymentId), {
        facturado: !currentStatus
      });
      
      console.log('Estado actualizado exitosamente');
      await fetchPayments();
    } catch (error: any) {
      console.error("Error updating facturado status: ", error);
      alert('Error al actualizar el estado: ' + error.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      console.log('=== ELIMINANDO PAGO ===');
      console.log('ID del pago a eliminar:', paymentId);
      
      const paymentToDelete = payments.find(p => p.id === paymentId);
      if (!paymentToDelete) {
        alert('No se encontró el pago a eliminar');
        return;
      }
      
      console.log('Pago a eliminar:', paymentToDelete);
      
      await deleteDoc(doc(db, 'payments', paymentId));
      console.log('✅ Pago eliminado de la base de datos');
      
      if (paymentToDelete.studentId) {
        console.log('=== ACTUALIZANDO MEMBRESÍA DEL ESTUDIANTE ===');
        console.log('Student ID:', paymentToDelete.studentId);
        
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
            console.log('✅ Membresía del estudiante actualizada (eliminada/pendiente)');
          } else {
            console.log('⚠️ El estudiante no existe en la base de datos');
          }
        } catch (updateError: any) {
          console.error('❌ Error al actualizar membresía del estudiante:', updateError);
          alert('El pago se eliminó pero no se pudo actualizar la membresía del estudiante: ' + updateError.message);
        }
      }
      
      setPayments(prev => prev.filter(payment => payment.id !== paymentId));
      setShowDeleteConfirm(null);
      
      setTimeout(async () => {
        await fetchPayments();
        await fetchStudents();
        console.log('✅ Datos refrescados');
      }, 2000);
      
      alert('✅ Pago eliminado exitosamente y membresía actualizada');
    } catch (error: any) {
      console.error('❌ Error al eliminar pago:', error);
      alert('Error al eliminar el pago: ' + error.message);
    }
  };

  const exportToExcel = () => {
    try {
      const dataToExport = filteredPayments.map(payment => {
        const plan = plans.find(p => p.name === payment.plan);
        const esDiario = plan ? isPaseDiario(plan.name, plan.price) : false;
        
        return {
          'Estudiante': payment.fullName,
          'Plan': payment.plan,
          'Tipo': esDiario ? 'Pase Diario' : 'Plan Mensual',
          'Monto': payment.amount,
          'Método de Pago': payment.method,
          'Fecha': payment.date,
          'Vigencia': esDiario ? 'Hasta 23:59 del día' : '30 días',
          'Estado': payment.facturado ? 'Facturado' : 'Pendiente'
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      const colWidths = [
        { wch: 20 }, // Estudiante
        { wch: 15 }, // Plan
        { wch: 12 }, // Tipo
        { wch: 10 }, // Monto
        { wch: 15 }, // Método
        { wch: 12 }, // Fecha
        { wch: 15 }, // Vigencia
        { wch: 12 }, // Estado
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

      const today = new Date().toISOString().split('T')[0];
      const fileName = `Pagos_${today}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error: any) {
      console.error('Error al exportar a Excel:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesName = payment.fullName.toLowerCase().includes(filters.name.toLowerCase());
    const matchesPlan = payment.plan.toLowerCase().includes(filters.plan.toLowerCase());
    const matchesAmount = filters.amount === '' || payment.amount.toString().includes(filters.amount);
    const matchesMethod = payment.method.toLowerCase().includes(filters.paymentMethod.toLowerCase());
    const matchesDate = filters.date === '' || payment.date.includes(filters.date);
    const matchesFacturado = filters.facturado === 'all' || 
      (filters.facturado === 'true' && payment.facturado) ||
      (filters.facturado === 'false' && !payment.facturado);

    return matchesName && matchesPlan && matchesAmount && matchesMethod && matchesDate && matchesFacturado;
  });

  // ✅ NUEVO: Obtener información del plan seleccionado para mostrar en el modal
  const selectedPlanInfo = getSelectedPlanInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-tent-orange text-white p-6 rounded-t-xl mb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CreditCard size={24} />
            <div>
              <h2 className="text-xl font-bold">Gestión de Pagos</h2>
              <p className="text-orange-100 text-sm">Registro de pagos de estudiantes • {filteredPayments.length} pagos</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {showFilters ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{showFilters ? 'Ocultar' : 'Mostrar'} Filtros</span>
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

      {/* Filtros */}
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
                <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
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
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
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

      {/* Tabla */}
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
                {filteredPayments.map(payment => {
                  // ✅ NUEVO: Mostrar información del tipo de plan en cada fila
                  const plan = plans.find(p => p.name === payment.plan);
                  const esDiario = plan ? isPaseDiario(plan.name, plan.price) : false;
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
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
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 text-xs font-medium bg-tent-orange/10 text-tent-orange rounded-full">
                              {payment.plan}
                            </span>
                            {/* ✅ NUEVO: Badge de tipo de plan */}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              esDiario
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {esDiario ? '☀️' : '📅'}
                            </span>
                          </div>
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
                          payment.date
                        )}
                      </td>
                      {/* ✅ NUEVA: Columna de vigencia */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          esDiario
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {esDiario ? 'Hasta 23:59' : '30 días'}
                        </span>
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
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-500 hover:text-red-500/80 transition-colors p-1 rounded"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                          <span className="text-sm text-gray-500">{student.plan}</span>
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

                {/* ✅ NUEVO: Información del plan seleccionado */}
                {selectedPlanInfo && (
                  <div className={`p-3 rounded-lg border ${
                    selectedPlanInfo.esDiario
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {selectedPlanInfo.esDiario ? (
                        <Sun size={16} className="text-yellow-600 mt-0.5" />
                      ) : (
                        <CalendarDays size={16} className="text-blue-600 mt-0.5" />
                      )}
                      <div className="text-sm">
                        <p className={`font-medium ${
                          selectedPlanInfo.esDiario ? 'text-yellow-800' : 'text-blue-800'
                        }`}>
                          {selectedPlanInfo.esDiario ? 'Pase Diario' : 'Plan Mensual'}
                        </p>
                        <p className={`${
                          selectedPlanInfo.esDiario ? 'text-yellow-700' : 'text-blue-700'
                        }`}>
                          Vigencia: {selectedPlanInfo.vigencia}
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
                    {selectedPlanInfo?.esDiario 
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
                        date: new Date().toISOString().split('T')[0],
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

      {/* Modal de confirmación para eliminar pago */}
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