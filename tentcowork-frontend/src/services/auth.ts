import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { isAdmin } from './firestore';

export const login = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const isAdminUser = await isAdmin(cred.user.uid);
  if (!isAdminUser) throw new Error('No tienes permisos de administrador');
  return cred.user;
};

export const logout = async () => {
  await signOut(auth);
};



