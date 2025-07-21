import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { isAdmin } from '../services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  checkAdminStatus: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminFlag, setIsAdminFlag] = useState(false);

  // Verificar si es admin (solo cuando lo llamás manualmente)
  const checkAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const adminStatus = await isAdmin(user.uid);
      setIsAdminFlag(adminStatus);
      return adminStatus;
    } catch (error) {
      console.log('Usuario no es admin');
      setIsAdminFlag(false);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setIsAdminFlag(false); // no verificar automáticamente
      } else {
        setUser(null);
        setIsAdminFlag(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: isAdminFlag, checkAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
