import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export function useCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      setData(docs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [collectionName]);

  return { data, loading, error, refetch };
}