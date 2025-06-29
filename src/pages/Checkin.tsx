import { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';

function estaDentroDelHorario(plan: string): boolean {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMin = hora * 60 + minutos;

  if (plan === 'full') return totalMin >= 480 && totalMin <= 1290; // 08:00 - 21:30
  if (plan === 'part-time') return totalMin >= 900 && totalMin <= 1290; // 15:00 - 21:30
  if (plan === 'diario') return totalMin >= 480 && totalMin <= 1290;

  return false;
}

function esMembresiaActiva(membresia: any): boolean {
  if (!membresia || membresia.estado !== 'activa') return false;
  const hoy = new Date();
  const vencimiento = new Date(membresia.fechaVencimiento);
  return hoy <= vencimiento;
}

export default function Checkin() {
  const [codigo, setCodigo] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estado, setEstado] = useState<'entrada' | 'salida' | 'rechazado' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setEstado(null);

    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('accessCode', '==', codigo));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMensaje('Código no encontrado.');
        setEstado('rechazado');
        return;
      }

      const studentDoc = snapshot.docs[0];
      const student = studentDoc.data();
      const studentId = studentDoc.id;

      const membresia = student.membresia;

      if (!esMembresiaActiva(membresia)) {
        setMensaje('No tenés una membresía activa.');
        setEstado('rechazado');
        return;
      }

      if (!estaDentroDelHorario(membresia.tipo)) {
        setMensaje('No estás dentro del horario permitido por tu plan.');
        setEstado('rechazado');
        return;
      }

      const sessionsRef = collection(db, 'sessions');

      if (!student.isCheckedIn) {
        await updateDoc(doc(db, 'students', studentId), {
          isCheckedIn: true,
          lastCheckInTimestamp: serverTimestamp(),
        });

        await addDoc(sessionsRef, {
          studentId,
          fullName: student.fullName,
          email: student.email,
          checkInTimestamp: serverTimestamp(),
          checkOutTimestamp: null,
          durationMinutes: null
        });

        setMensaje(`¡Bienvenido, ${student.fullName}!`);
        setEstado('entrada');
      } else {
        await updateDoc(doc(db, 'students', studentId), {
          isCheckedIn: false,
        });

        const activeSessionQuery = query(sessionsRef, where('studentId', '==', studentId), where('checkOutTimestamp', '==', null));
        const activeSnapshot = await getDocs(activeSessionQuery);

        if (!activeSnapshot.empty) {
          const sessionDoc = activeSnapshot.docs[0];
          const checkInTime = sessionDoc.data().checkInTimestamp.toDate();
          const now = new Date();
          const durationMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));

          await updateDoc(doc(db, 'sessions', sessionDoc.id), {
            checkOutTimestamp: serverTimestamp(),
            durationMinutes
          });
        }

        setMensaje(`¡Hasta luego, ${student.fullName}}!`);
        setEstado('salida');
      }
    } catch (error) {
      console.error(error);
      setMensaje('Hubo un error al procesar el check-in/out.');
      setEstado('rechazado');
    }
  };

  return (
    <div className="container">
      <h2>Check-in / Check-out</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={5}
          pattern="[0-9]*"
          inputMode="numeric"
          placeholder="Ingresá tu código de acceso"
          className="w-full text-center"
          required
        />
        <button type="submit" className="btn-primary">Registrar</button>
      </form>
      {mensaje && <div style={{ marginTop: '1rem', color: estado === 'rechazado' ? 'red' : 'green' }}>{mensaje}</div>}
    </div>
  );
}
