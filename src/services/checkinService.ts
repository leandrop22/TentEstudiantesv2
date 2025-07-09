  import {
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    addDoc,
    serverTimestamp,
    doc,
    getFirestore
  } from 'firebase/firestore';
  import { db } from '../utils/firebase';

  function estaDentroDelHorario(plan: string): boolean {
    const ahora = new Date();
    const totalMin = ahora.getHours() * 60 + ahora.getMinutes();

    if (plan === 'full') return totalMin >= 480 && totalMin <= 1290;
    if (plan === 'part-time') return totalMin >= 900 && totalMin <= 1290;
    if (plan === 'diario') return totalMin >= 480 && totalMin <= 1290;

    return false;
  }

  function esMembresiaActiva(membresia: any): boolean {
    if (!membresia || membresia.estado !== 'activa') return false;
    const hoy = new Date();
    const vencimiento = new Date(membresia.fechaVencimiento);
    return hoy <= vencimiento;
  }
  // Devuelve el estudiante por código y verifica membresía activa
  export const checkStudentStatus = async (code: string) => {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('accessCode', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Código no encontrado.');
    }

    const student = snapshot.docs[0].data();
    const membresia = student.membresia;

    if (!esMembresiaActiva(membresia)) {
      throw new Error('No tenés una membresía activa.');
    }

    if (!estaDentroDelHorario(membresia.tipo)) {
      throw new Error('No estás dentro del horario permitido por tu plan.');
    }

    return student;
  };

  // Recuperación de código por email (puede mejorarse después)
 export const recoverCodeByEmail = async (email: string): Promise<string> => {
  const db = getFirestore();
  const trimmedEmail = email.trim().toLowerCase(); // 🔧 normaliza el email

  const q = query(
    collection(db, "students"), // ⬅️ Cambiá "students" si tu colección tiene otro nombre
    where("email", "==", trimmedEmail)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("No se encontró ningún estudiante con ese email.");
  }

  const doc = querySnapshot.docs[0];
  const data = doc.data();

  if (!data.accessCode) {
    throw new Error("No se encontró un código de acceso asociado.");
  }

  return data.accessCode;
};
  export const checkInOrOut = async (code: string): Promise<{ mensaje: string; estado: 'entrada' | 'salida' | 'rechazado' }> => {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('accessCode', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { mensaje: 'Código no encontrado.', estado: 'rechazado' };
    }

    const studentDoc = snapshot.docs[0];
    const student = studentDoc.data();
    const studentId = studentDoc.id;

    const membresia = student.membresia;

    if (!esMembresiaActiva(membresia)) {
      return { mensaje: 'No tenés una membresía activa.', estado: 'rechazado' };
    }

    if (!estaDentroDelHorario(membresia.tipo)) {
      return { mensaje: 'No estás dentro del horario permitido por tu plan.', estado: 'rechazado' };
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
        durationMinutes: null,
      });

      return { mensaje: `¡Bienvenido, ${student.fullName}!`, estado: 'entrada' };
    } else {
      // Check-out
      await updateDoc(doc(db, 'students', studentId), {
        isCheckedIn: false,
      });

      const activeSessionQuery = query(
        sessionsRef,
        where('studentId', '==', studentId),
        where('checkOutTimestamp', '==', null)
      );
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

      return { mensaje: `¡Hasta luego, ${student.fullName}!`, estado: 'salida' };
    }

    
  };
