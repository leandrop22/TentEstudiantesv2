import { useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const universidades = [
  'UNCuyo',
  'UTN',
  'UMaza',
  'Aconcagua',
  'Champagnat',
  'Univ. de Mendoza',
  'Congreso',
  'Otra',
];

export default function RegisterForm() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    faculty: '',
    career: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString(); // Código de 5 dígitos
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newStudent = {
        ...form,
        accessCode: generateCode(),
        createdAt: Timestamp.now(),
        certificadoPresentado: false,
        planStart: null,
        planEnd: null,
        minutesUsed: 0,
      };
      await addDoc(collection(db, 'students'), newStudent);
      setMessage('Registro exitoso. Te llegará el código por email.');
      setForm({ fullName: '', email: '', phone: '', faculty: '', career: '' });
    } catch (error) {
      console.error(error);
      setMessage('Error al registrar. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <div>
        <label className="block text-sm font-medium">Nombre completo</label>
        <input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Teléfono</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Universidad</label>
        <select
          name="faculty"
          value={form.faculty}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">Seleccioná una opción</option>
          {universidades.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Carrera</label>
        <input
          name="career"
          value={form.career}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-green-700 hover:bg-green-800 text-white w-full py-2 rounded"
      >
        {loading ? 'Registrando...' : 'Registrarse'}
      </button>

      {message && <p className="text-center text-sm text-blue-700 mt-2">{message}</p>}
    </form>
  );
}
