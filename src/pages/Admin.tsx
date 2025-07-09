import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function Admin() {
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [formData, setFormData] = useState({ name: '', price: '', description: '', days: '', startHour: '', endHour: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    studentName: '', faculty: '',
    sessionName: '', sessionIn: '', sessionOut: '',
    paymentName: '', paymentMethod: '', paymentDate: ''
  });

  const safeToDateString = (ts: any) => ts instanceof Timestamp ? ts.toDate().toLocaleString() : '—';
  const safeToDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : null;

  useEffect(() => {
    const fetchData = async () => {
      const s = await getDocs(collection(db, 'students'));
      const ses = await getDocs(collection(db, 'sessions'));
      const p = await getDocs(collection(db, 'plans'));
      const pay = await getDocs(collection(db, 'payments'));
      setStudents(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSessions(ses.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPlans(p.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPayments(pay.docs.map(doc => ({ id: doc.id, ...doc.data(), method: doc.data().method || 'Desconocido' })));
    };
    fetchData();
  }, []);

  const exportToExcel = (data: any[], filename: string) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
    XLSX.writeFile(book, `${filename}.xlsx`);
  };

  const closeAllSessions = async () => {
    const openSessions = sessions.filter(s => !s.checkOutTimestamp);
    await Promise.all(openSessions.map(async s => {
      const checkIn = safeToDate(s.checkInTimestamp);
      const duration = checkIn ? Math.floor((Date.now() - checkIn.getTime()) / 60000) : 0;
      await updateDoc(doc(db, 'sessions', s.id), {
        checkOutTimestamp: Timestamp.now(),
        durationMinutes: duration
      });
    }));
    setMensaje('Sesiones cerradas correctamente');
  };

  const handlePlanSubmit = async () => {
    const plan = { ...formData, price: Number(formData.price) };
    if (editingId) {
      await updateDoc(doc(db, 'plans', editingId), plan);
    } else {
      await addDoc(collection(db, 'plans'), plan);
    }
    setFormData({ name: '', price: '', description: '', days: '', startHour: '', endHour: '' });
    setEditingId(null);
    const p = await getDocs(collection(db, 'plans'));
    setPlans(p.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const deletePlan = async (id: string) => {
    await deleteDoc(doc(db, 'plans', id));
    const p = await getDocs(collection(db, 'plans'));
    setPlans(p.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const filterText = (val = '', query = '') => val.toLowerCase().includes(query.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <h1 className="text-3xl font-bold mb-4">Panel de Administración</h1>

      <div>
        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" onClick={closeAllSessions}>
          Cerrar todas las sesiones abiertas
        </button>
        {mensaje && <p className="text-green-600 mt-2">{mensaje}</p>}
      </div>

      {/* Planes */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Planes</h2>
        <div className="flex flex-wrap gap-2">
          {['name', 'price', 'days', 'startHour', 'endHour', 'description'].map((field) => (
            <input
              key={field}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={(formData as any)[field]}
              onChange={e => setFormData({ ...formData, [field]: e.target.value })}
              className="border px-2 py-1 rounded"
            />
          ))}
          <button onClick={handlePlanSubmit} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded">
            {editingId ? 'Editar' : 'Agregar'}
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {plans.map(p => (
            <li key={p.id} className="flex justify-between border-b pb-1">
              <span>{p.name} - ${p.price}</span>
              <span className="space-x-2">
                <button onClick={() => { setEditingId(p.id); setFormData(p); }}>✏️</button>
                <button onClick={() => deletePlan(p.id)}>🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Estudiantes */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Estudiantes</h2>
        <button onClick={() => exportToExcel(students, 'estudiantes')} className="mb-2 bg-blue-500 text-white px-4 py-1 rounded">Exportar Excel</button>
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Nombre</th>
              <th>Email</th>
              <th>Facultad</th>
            </tr>
            <tr>
              <th><input value={filters.studentName} onChange={e => setFilters({ ...filters, studentName: e.target.value })} /></th>
              <th></th>
              <th><input value={filters.faculty} onChange={e => setFilters({ ...filters, faculty: e.target.value })} /></th>
            </tr>
          </thead>
          <tbody>
            {students
              .filter(s => filterText(s.fullName, filters.studentName) && filterText(s.faculty, filters.faculty))
              .map(s => (
                <tr key={s.id}>
                  <td className="p-1">{s.fullName}</td>
                  <td>{s.email}</td>
                  <td>{s.faculty}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* Sesiones */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Sesiones</h2>
        <button onClick={() => exportToExcel(sessions, 'sesiones')} className="mb-2 bg-blue-500 text-white px-4 py-1 rounded">Exportar Excel</button>
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th>Nombre</th>
              <th>Entrada</th>
              <th>Salida</th>
            </tr>
            <tr>
              <th><input value={filters.sessionName} onChange={e => setFilters({ ...filters, sessionName: e.target.value })} /></th>
              <th><input value={filters.sessionIn} onChange={e => setFilters({ ...filters, sessionIn: e.target.value })} /></th>
              <th><input value={filters.sessionOut} onChange={e => setFilters({ ...filters, sessionOut: e.target.value })} /></th>
            </tr>
          </thead>
          <tbody>
            {sessions
              .filter(s =>
                filterText(s.fullName, filters.sessionName) &&
                safeToDateString(s.checkInTimestamp).includes(filters.sessionIn) &&
                safeToDateString(s.checkOutTimestamp).includes(filters.sessionOut)
              )
              .map(s => (
                <tr key={s.id}>
                  <td className="p-1">{s.fullName}</td>
                  <td>{safeToDateString(s.checkInTimestamp)}</td>
                  <td>{s.checkOutTimestamp ? safeToDateString(s.checkOutTimestamp) : 'En curso'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* Pagos */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Pagos</h2>
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th>Nombre</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Fecha</th>
            </tr>
            <tr>
              <th><input value={filters.paymentName} onChange={e => setFilters({ ...filters, paymentName: e.target.value })} /></th>
              <th></th>
              <th><input value={filters.paymentMethod} onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })} /></th>
              <th><input value={filters.paymentDate} onChange={e => setFilters({ ...filters, paymentDate: e.target.value })} /></th>
            </tr>
          </thead>
          <tbody>
            {payments
              .filter(p =>
                filterText(p.fullName, filters.paymentName) &&
                filterText(p.method, filters.paymentMethod) &&
                safeToDate(p.date)?.toLocaleDateString().includes(filters.paymentDate)
              )
              .map(p => (
                <tr key={p.id}>
                  <td className="p-1">{p.fullName}</td>
                  <td>${p.amount}</td>
                  <td>{p.method}</td>
                  <td>{safeToDate(p.date)?.toLocaleDateString() || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
