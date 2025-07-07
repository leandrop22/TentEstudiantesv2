import { addDoc, collection, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const doCheckin = async (code: string) => {
  const studentRef = doc(db, 'students', code);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) throw new Error('Código inválido');

  const student = studentSnap.data();

  const sessionRef = collection(db, 'sessions');
  await addDoc(sessionRef, {
    studentId: code,
    fullName: student.fullName,
    checkInTimestamp: Timestamp.now(),
  });
};

export const doCheckout = async (sessionId: string) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    checkOutTimestamp: Timestamp.now(),
  });
};

export const getStudentStatus = async (code: string) => {
  const studentRef = doc(db, 'students', code);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) throw new Error('Código inválido');
  return studentSnap.data();
};
