import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

export default function Register() {
  const [form, setForm] = useState({ nombre: '', facultad: '', carrera: '', telefono: '', email: '' });
  const [accessCode, setAccessCode] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateAccessCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('email', '==', form.email));
      const existing = await getDocs(q);

      if (!existing.empty) {
        alert('Este email ya está registrado.');
        return;
      }

      const newCode = generateAccessCode();

      await addDoc(studentsRef, {
        fullName: form.nombre,
        faculty: form.facultad,
        Carrera: form.carrera,
        phone: form.telefono,
        email: form.email,
        accessCode: newCode,
        isCheckedIn: false,
        createdAt: serverTimestamp(),
        lastCheckInTimestamp: null
      });

      setAccessCode(newCode);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al registrar.');
    }
  };

  return (
    <div className="container">
      <h2>Registro de Estudiante</h2>
      {accessCode ? (
        <div>
          <p><strong>¡Registro exitoso!</strong></p>
          <p>Tu código de acceso es: <strong>{accessCode}</strong></p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Nombre completo</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required className="w-full" />
          </div>
          <div>
            <label>Universidad</label>
            <select name="facultad" value={form.facultad} onChange={handleChange} required className="w-full">
              <option value="">Seleccioná tu universidad</option>
              <option value="UNCUYO">Universidad Nacional de Cuyo (UNCUYO)</option>
              <option value="UTN">Universidad Tecnológica Nacional (UTN)</option>
              <option value="IUSP">Instituto Universitario de Seguridad Pública (IUSP)</option>
              <option value="UM">Universidad de Mendoza (UM)</option>
              <option value="UDA">Universidad del Aconcagua (UDA)</option>
              <option value="UCH">Universidad Champagnat (UCH)</option>
              <option value="Ucongreso">Universidad de Congreso</option>
              <option value="UMaza">Universidad Juan Agustín Maza (UMaza)</option>
              <option value="UCA">Universidad Católica Argentina (UCA)</option>
              <option value="Siglo21">Universidad Siglo 21</option>
              <option value="UAI">Universidad Abierta Interamericana (UAI)</option>
              <option value="UDEMM">Universidad de la Marina Mercante (UdeMM)</option>
              <option value="FASTA">Universidad FASTA</option>
              <option value="UFLO">Universidad de Flores (UFLO)</option>
              <option value="UNA">Universidad Nacional de las Artes (UNA)</option>
              <option value="IslasMalvinas">Escuela Internacional Islas Malvinas</option>
              <option value="Otra">Otra</option>
            </select>
          </div>
          <div>
            <label>Carrera</label>
            <input type="text" name="carrera" value={form.carrera} onChange={handleChange} required className="w-full" />
          </div>
          <div>
            <label>Teléfono</label>
            <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required className="w-full" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full" />
          </div>
          <button type="submit" className="btn-primary">Registrarme</button>
        </form>
      )}
    </div>
  );
}