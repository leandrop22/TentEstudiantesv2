import {
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getFirestore,
  Timestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';

interface Student {
  fullName?: string;
  email?: string;
  plan?: any;
  membresia?: {
    nombre?: string;
    fechaDesde?: string | Timestamp;
    fechaHasta?: string | Timestamp;
  };
  isCheckedIn?: boolean;
  accessCode?: string;
  [key: string]: any; // Para propiedades adicionales
}

// Función para convertir fecha a Date independientemente del tipo
const convertirADate = (fecha: string | Timestamp | undefined): Date | null => {
  if (!fecha) return null;
  
  if (typeof fecha === 'string') {
    return new Date(fecha);
  } else if (fecha instanceof Timestamp) {
    return fecha.toDate();
  } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
    // Por si es un Timestamp de Firebase pero sin el tipo correcto
    return (fecha as any).toDate();
  }
  
  return null;
};

// Función actualizada para verificar horario usando datos dinámicos del plan
function estaDentroDelHorario(plan: any): boolean {
  if (!plan || !plan.startHour || !plan.endHour) {
    /* console.log('❌ Plan sin horarios definidos', plan); */

    return false;
  }

  const ahora = new Date();
  const horaActual = ahora.getHours() * 100 + ahora.getMinutes(); // Formato HHMM
  
  // Convertir horarios del plan a formato numérico de manera segura
  const startHour = String(plan.startHour).replace(':', '');
  const endHour = String(plan.endHour).replace(':', '');
  const horaInicio = parseInt(startHour);
  const horaFin = parseInt(endHour);

  /* console.log('=== VERIFICACIÓN DE HORARIOS (SERVICE) ==='); */

  /* console.log('Hora actual:', ahora.toLocaleTimeString()); */

  /* console.log('Hora actual (numérica):', horaActual); */

  /* console.log('Horario del plan:', `${plan.startHour} - ${plan.endHour}`); */

  /* console.log('Hora inicio (numérica):', horaInicio); */

  /* console.log('Hora fin (numérica):', horaFin); */


  const dentroDelHorario = horaActual >= horaInicio && horaActual <= horaFin;
  /* console.log('Dentro del horario:', dentroDelHorario); */


  return dentroDelHorario;
}

// Función actualizada para verificar membresía usando fechaDesde y fechaHasta
function esMembresiaActiva(membresia: any): boolean {
  if (!membresia || !membresia.fechaDesde || !membresia.fechaHasta) {
    /* console.log('❌ Membresía sin fechas válidas', membresia); */

    return false;
  }

  const hoy = new Date();
  const desde = convertirADate(membresia.fechaDesde);
  const hasta = convertirADate(membresia.fechaHasta);

  /* console.log('=== VERIFICACIÓN DE MEMBRESÍA (SERVICE) ==='); */

  /* console.log('Hoy:', hoy.toISOString()); */

  /* console.log('Desde:', desde?.toISOString() || 'null'); */

  /* console.log('Hasta:', hasta?.toISOString() || 'null'); */


  if (!desde || !hasta) {
    /* console.log('❌ Fechas inválidas'); */

    return false;
  }

  // Verificar si está en el período de vigencia
  if (hoy < desde) {
    /* console.log('❌ Membresía aún no activada'); */

    return false;
  }

  if (hoy > hasta) {
    /* console.log('❌ Membresía vencida'); */

    return false;
  }

  /* console.log('✅ Membresía activa'); */

  return true;
}

// Función para obtener los datos completos del plan
const obtenerDatosPlan = async (planRef: any) => {
  try {
    /* console.log('=== OBTENIENDO DATOS DEL PLAN ==='); */

    /* console.log('planRef recibido:', planRef); */

    /* console.log('Tipo de planRef:', typeof planRef); */


    // Si el plan ya es un objeto con horarios, devolverlo
    if (planRef && typeof planRef === 'object' && planRef.startHour && planRef.endHour) {
      /* console.log('✅ Plan ya tiene horarios completos'); */

      return planRef;
    }

    // Si es una referencia/ID string, buscar en la colección de planes
    if (typeof planRef === 'string') {
      /* console.log('🔍 Buscando plan por nombre:', planRef); */

      const planesRef = collection(db, 'plans');
      const planQuery = query(planesRef, where('name', '==', planRef));
      const planSnapshot = await getDocs(planQuery);
      
      if (!planSnapshot.empty) {
        const planData = planSnapshot.docs[0].data();
        /* console.log('✅ Plan encontrado por nombre:', planData); */

        return planData;
      } else {
        /* console.log('❌ No se encontró plan con nombre:', planRef); */

      }
    }

    // Si el plan tiene un campo name, buscar por ese nombre
    if (planRef && planRef.name) {
      /* console.log('🔍 Buscando plan por campo name:', planRef.name); */

      const planesRef = collection(db, 'plans');
      const planQuery = query(planesRef, where('name', '==', planRef.name));
      const planSnapshot = await getDocs(planQuery);
      
      if (!planSnapshot.empty) {
        const planData = planSnapshot.docs[0].data();
        /* console.log('✅ Plan encontrado por campo name:', planData); */

        return planData;
      }
    }

    // Intento adicional: listar todos los planes para debug
    /* console.log('🔍 Listando todos los planes disponibles para debug...'); */

    const allPlansQuery = collection(db, 'plans');
    const allPlansSnapshot = await getDocs(allPlansQuery);
    
    /* console.log('Planes disponibles:'); */

    allPlansSnapshot.docs.forEach((doc, index) => {
      /* console.log(`Plan ${index + 1}:`, doc.data()); */

    });

    /* console.log('❌ No se encontró el plan o no tiene horarios'); */

    return null;
  } catch (error) {
    console.error('❌ Error obteniendo datos del plan:', error);
    return null;
  }
};

// Devuelve el estudiante por código y verifica membresía activa
export const checkStudentStatus = async (code: string): Promise<Student> => {
  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, where('accessCode', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Código no encontrado.');
  }

  const studentData = snapshot.docs[0].data() as Student;
  /* console.log('=== DATOS DEL ESTUDIANTE (SERVICE) ==='); */

  /* console.log('Student data original:', studentData); */

  /* console.log('Membresía:', studentData.membresia); */

  /* console.log('Plan (original):', studentData.plan); */


  // IMPORTANTE: Obtener los datos completos del plan
  const planCompleto = await obtenerDatosPlan(studentData.plan);
  /* console.log('Plan completo obtenido:', planCompleto); */


  // Solo verificar membresía aquí, NO horarios
  if (!esMembresiaActiva(studentData.membresia)) {
    throw new Error('No tenés una membresía activa.');
  }

  // Retornar estudiante completo con plan actualizado
  const studentCompleto: Student = {
    ...studentData,
    plan: planCompleto || studentData.plan // Usar plan completo o fallback al original
  };

  /* console.log('=== ESTUDIANTE COMPLETO FINAL ==='); */

  /* console.log('Student completo:', studentCompleto); */

  /* console.log('Tiene fullName:', !!studentCompleto.fullName); */

  /* console.log('Tiene email:', !!studentCompleto.email); */

  /* console.log('Tiene membresia:', !!studentCompleto.membresia); */


  return studentCompleto;
};

// Recuperación de código por email
export const recoverCodeByEmail = async (email: string): Promise<string> => {
  const db = getFirestore();
  const trimmedEmail = email.trim().toLowerCase();

  const q = query(
    collection(db, "students"),
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
  const student = studentDoc.data() as Student;
  const studentId = studentDoc.id;

  /* console.log('=== CHECK IN/OUT (SERVICE) ==='); */

  /* console.log('Student:', student); */

  /* console.log('Membresía:', student.membresia); */

  /* console.log('Plan (original):', student.plan); */

  /* console.log('isCheckedIn:', student.isCheckedIn); */


  // Obtener los datos completos del plan
  const planCompleto = await obtenerDatosPlan(student.plan);
  /* console.log('Plan completo para check-in/out:', planCompleto); */


  // Verificar membresía
  if (!esMembresiaActiva(student.membresia)) {
    return { mensaje: 'No tenés una membresía activa.', estado: 'rechazado' };
  }

  // Verificar horario usando el plan dinámico completo
  if (!estaDentroDelHorario(planCompleto)) {
    return { 
      mensaje: `No estás dentro del horario permitido. Tu plan "${planCompleto?.name || 'actual'}" permite acceso de ${planCompleto?.startHour} a ${planCompleto?.endHour}`, 
      estado: 'rechazado' 
    };
  }

  const sessionsRef = collection(db, 'sessions');

  if (!student.isCheckedIn) {
    // Check-in
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