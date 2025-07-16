import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'admins', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
};

export const getCollectionData = async (collectionName: string) => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
