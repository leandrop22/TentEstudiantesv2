// Panel Admin completo con ordenamiento, filtros, exportación, cierre de sesiones, gestión de planes y pagos
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function Admin() {
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '', days: '', startHour: '', endHour: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const [filters, setFilters] = useState({
    studentName: '', faculty: '',
    sessionName: '', sessionIn: '', sessionOut: '',
    paymentName: '', paymentMethod: '', paymentDate: ''
  });

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

  const sortData = (data: any[], key: string) => [...data].sort((a, b) => {
    const valA = a[key] || ''; const valB = b[key] || '';
    return sortDirection === 'asc' ? valA.toString().localeCompare(valB.toString()) : valB.toString().localeCompare(valA.toString());
  });

  const handleSort = (key: string) => {
    const direction = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key); setSortDirection(direction);
  };

  const exportToExcel = (data: any[], filename: string) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
    XLSX.writeFile(book, `${filename}.xlsx`);
  };

  const closeAllSessions = async () => {
    const openSessions = sessions.filter(s => !s.checkOutTimestamp);
    const updates = openSessions.map(async s => {
      const duration = Math.floor((new Date().getTime() - s.checkInTimestamp.toDate().getTime()) / 60000);
      await updateDoc(doc(db, 'sessions', s.id), {
        checkOutTimestamp: Timestamp.now(),
        durationMinutes: duration
      });
    });
    await Promise.all(updates);
    setMensaje('Sesiones cerradas');
  };

  const filteredStudents = students.filter(s => s.fullName?.toLowerCase().includes(filters.studentName.toLowerCase()) && s.faculty?.toLowerCase().includes(filters.faculty.toLowerCase()));
  const filteredSessions = sessions.filter(s => s.fullName?.toLowerCase().includes(filters.sessionName.toLowerCase()) && s.checkInTimestamp?.toDate().toLocaleString().includes(filters.sessionIn) && s.checkOutTimestamp?.toDate().toLocaleString().includes(filters.sessionOut));
  const filteredPayments = payments.filter(p => p.fullName?.toLowerCase().includes(filters.paymentName.toLowerCase()) && p.method?.toLowerCase().includes(filters.paymentMethod.toLowerCase()) && p.date?.toDate().toLocaleDateString().includes(filters.paymentDate));

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

  return (
    <div className="p-6 space-y-10">
      <h2 className="text-xl font-bold mb-4">Panel Admin</h2>

      <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={closeAllSessions}>Cerrar sesiones abiertas</button>
      {mensaje && <p className="text-green-600">{mensaje}</p>}

      <section>
        <h3 className="font-bold text-lg">Planes</h3>
        <div className="flex flex-wrap gap-2 my-2">
          <input placeholder="Nombre" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="border px-2" />
          <input placeholder="Precio" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="border px-2" />
          <input placeholder="Días" value={formData.days} onChange={e => setFormData({ ...formData, days: e.target.value })} className="border px-2" />
          <input placeholder="Hora inicio" value={formData.startHour} onChange={e => setFormData({ ...formData, startHour: e.target.value })} className="border px-2" />
          <input placeholder="Hora fin" value={formData.endHour} onChange={e => setFormData({ ...formData, endHour: e.target.value })} className="border px-2" />
          <input placeholder="Descripción" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="border px-2 w-60" />
          <button onClick={handlePlanSubmit} className="bg-green-600 text-white px-2">{editingId ? 'Editar' : 'Agregar'}</button>
        </div>
        <ul>
          {plans.map(p => (
            <li key={p.id} className="border-b py-1 flex justify-between">
              <span>{p.name} - ${p.price}</span>
              <span className="space-x-2">
                <button onClick={() => { setEditingId(p.id); setFormData(p); }}>✏️</button>
                <button onClick={() => deletePlan(p.id)}>🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Estudiantes</h3>
        <button onClick={() => exportToExcel(filteredStudents, 'estudiantes')}>Exportar Excel</button>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th onClick={() => handleSort('fullName')} className="cursor-pointer">Nombre</th>
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
            {sortData(filteredStudents, sortKey).map(s => (
              <tr key={s.id}><td>{s.fullName}</td><td>{s.email}</td><td>{s.faculty}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Sesiones</h3>
        <button onClick={() => exportToExcel(filteredSessions, 'sesiones')}>Exportar Excel</button>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
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
            {filteredSessions.map(s => (
              <tr key={s.id}><td>{s.fullName}</td><td>{s.checkInTimestamp?.toDate().toLocaleString()}</td><td>{s.checkOutTimestamp?.toDate().toLocaleString() || 'En curso'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Pagos</h3>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
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
            {filteredPayments.map(p => (
              <tr key={p.id}><td>{p.fullName}</td><td>${p.amount}</td><td>{p.method}</td><td>{p.date?.toDate().toLocaleDateString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
