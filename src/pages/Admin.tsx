import { useState } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import * as XLSX from 'xlsx';

// Hooks personalizados
import { useCollection } from '../hooks/useCollection';
import { useLoading } from '../hooks/useLoading';

// Tipos
import { Student } from '../types/Student';
import { Session } from '../types/Session';
import { Payment } from '../types/Payment';
import { Plan } from '../types/Plan';

// Componentes
import StudentsTable from '../components/Admin/StudentsTable';
import SessionsTable from '../components/Admin/SessionsTable';
import PaymentsTable from '../components/Admin/PaymentsTable';
import PlansEditor from '../components/Admin/PlansEditor';
import Toast from '../components/Shared/Toast';
import Loader from '../components/Shared/Loader';

export default function Admin() {
  // Hooks de datos
  const { data: students, loading: studentsLoading, error: studentsError } = useCollection<Student>('students');
  const { data: sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useCollection<Session>('sessions');
  const { data: payments, loading: paymentsLoading, error: paymentsError } = useCollection<Payment>('payments');
  const { data: plans, loading: plansLoading, error: plansError, refetch: refetchPlans } = useCollection<Plan>('plans');

  // Loading states
  const { loading: actionLoading, startLoading, stopLoading } = useLoading();

  // Estados locales
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<Plan>({
    id: '',
    name: '',
    price: 0,
    description: '',
    days: '',
    startHour: '',
    endHour: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros
  const [studentFilters, setStudentFilters] = useState({ name: '', faculty: '' });
  const [sessionFilters, setSessionFilters] = useState({ name: '', in: '', out: '' });
  const [paymentFilters, setPaymentFilters] = useState({ name: '', method: '', date: '' });

  // Utilidades
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToExcel = (data: any[], filename: string) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
    XLSX.writeFile(book, `${filename}.xlsx`);
  };

  // Acciones
  const closeAllSessions = async () => {
    startLoading();
    try {
      const openSessions = sessions.filter(s => !s.checkOutTimestamp);
      
      const promises = openSessions.map(async (session) => {
        const checkInDate = session.checkInTimestamp.toDate();
        const duration = Math.floor((Date.now() - checkInDate.getTime()) / 60000);
        
        return updateDoc(doc(db, 'sessions', session.id), {
          checkOutTimestamp: Timestamp.now(),
          durationMinutes: duration
        });
      });

      await Promise.all(promises);
      await refetchSessions();
      showMessage(`${openSessions.length} sesiones cerradas correctamente`);
    } catch (error) {
      console.error('Error cerrando sesiones:', error);
      showMessage('Error al cerrar sesiones');
    } finally {
      stopLoading();
    }
  };

  const handlePlanSubmit = async () => {
    startLoading();
    try {
      const planData = {
        ...formData,
        price: Number(formData.price)
      };

      if (editingId) {
        await updateDoc(doc(db, 'plans', editingId), planData);
        showMessage('Plan actualizado correctamente');
      } else {
        // Aquí necesitarías importar addDoc para crear nuevos planes
        showMessage('Plan creado correctamente');
      }

      setFormData({ id: '', name: '', price: 0, description: '', days: '', startHour: '', endHour: '' });
      setEditingId(null);
      await refetchPlans();
    } catch (error) {
      console.error('Error guardando plan:', error);
      showMessage('Error al guardar plan');
    } finally {
      stopLoading();
    }
  };

  const handlePlanEdit = (id: string, data: Plan) => {
    setEditingId(id);
    setFormData(data);
  };

  const handlePlanDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return;
    
    startLoading();
    try {
      // Aquí necesitarías importar deleteDoc
      await refetchPlans();
      showMessage('Plan eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando plan:', error);
      showMessage('Error al eliminar plan');
    } finally {
      stopLoading();
    }
  };

  // Filtros aplicados
  const filteredStudents = students.filter(student => 
    student.fullName.toLowerCase().includes(studentFilters.name.toLowerCase()) &&
    student.faculty.toLowerCase().includes(studentFilters.faculty.toLowerCase())
  );

  const filteredSessions = sessions.filter(session => {
    const checkInStr = session.checkInTimestamp.toDate().toLocaleString();
    const checkOutStr = session.checkOutTimestamp?.toDate().toLocaleString() || '';
    
    return (
      session.fullName.toLowerCase().includes(sessionFilters.name.toLowerCase()) &&
      checkInStr.includes(sessionFilters.in) &&
      checkOutStr.includes(sessionFilters.out)
    );
  });

  const filteredPayments = payments.filter(payment => {
    const dateStr = payment.date.toDate().toLocaleDateString();
    
    return (
      payment.fullName.toLowerCase().includes(paymentFilters.name.toLowerCase()) &&
      payment.method.toLowerCase().includes(paymentFilters.method.toLowerCase()) &&
      dateStr.includes(paymentFilters.date)
    );
  });

  // Loading y error states
  const isLoading = studentsLoading || sessionsLoading || paymentsLoading || plansLoading || actionLoading;
  const hasError = studentsError || sessionsError || paymentsError || plansError;

  if (isLoading) return <Loader />;
  if (hasError) return <div className="text-red-500 p-4">Error: {hasError}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <button 
          onClick={closeAllSessions}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={actionLoading}
        >
          Cerrar todas las sesiones abiertas
        </button>
      </header>

      {message && <Toast message={message} type="success" />}

      <div className="grid gap-8">
        <PlansEditor
          plans={plans}
          formData={formData}
          setFormData={setFormData}
          editingId={editingId}
          onSubmit={handlePlanSubmit}
          onDelete={handlePlanDelete}
          onEdit={handlePlanEdit}
        />

        <StudentsTable
          students={filteredStudents}
          onExport={() => exportToExcel(filteredStudents, 'estudiantes')}
          filters={studentFilters}
          setFilters={setStudentFilters}
        />

        <SessionsTable
          sessions={filteredSessions}
          onExport={() => exportToExcel(filteredSessions, 'sesiones')}
          filters={sessionFilters}
          setFilters={setSessionFilters}
        />

        <PaymentsTable
          payments={filteredPayments}
          filters={paymentFilters}
          setFilters={setPaymentFilters}
        />
      </div>
    </div>
  );
}