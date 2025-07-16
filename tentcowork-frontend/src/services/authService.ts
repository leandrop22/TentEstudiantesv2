
import { 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../utils/firebase';

// Configuración de la API
const API_BASE_URL = 'http://localhost:4000/api';

// Tipos para las respuestas
interface UserRoleResponse {
  isAdmin: boolean;
  isStudent: boolean;
  uid: string;
}

interface LoginResponse {
  uid: string;
  isAdmin: boolean;
  isStudent: boolean;
  token: string;
}

// Clase para manejar errores de autenticación
export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Función para obtener el rol del usuario desde el backend
const getUserRole = async (uid: string, token: string): Promise<UserRoleResponse> => {
  const response = await fetch(`${API_BASE_URL}/user-role/${uid}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new AuthError(errorData.error || 'Error al verificar el usuario');
  }

  return response.json();
};

// Login con email y contraseña
export const loginWithEmail = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();
    
    const userRole = await getUserRole(user.uid, token);
    
    // Verificar que el usuario tenga permisos
    if (!userRole.isAdmin && !userRole.isStudent) {
      await signOut(auth);
      throw new AuthError('Tu cuenta no está registrada correctamente.');
    }
    
    return {
      uid: user.uid,
      isAdmin: userRole.isAdmin,
      isStudent: userRole.isStudent,
      token,
    };
  } catch (error) {
    console.error('Error en login:', error);
    
    // Manejar errores específicos de Firebase
    if (error instanceof Error) {
      if (error.message.includes('user-not-found')) {
        throw new AuthError('Usuario no encontrado.');
      }
      if (error.message.includes('wrong-password')) {
        throw new AuthError('Contraseña incorrecta.');
      }
      if (error.message.includes('too-many-requests')) {
        throw new AuthError('Demasiados intentos fallidos. Intenta más tarde.');
      }
    }
    
    throw error;
  }
};

// Login con Google
export const loginWithGoogle = async (): Promise<LoginResponse> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const token = await user.getIdToken();
    
    const userRole = await getUserRole(user.uid, token);
    
    // Verificar que el usuario tenga permisos
    if (!userRole.isAdmin && !userRole.isStudent) {
      await signOut(auth);
      throw new AuthError('Tu cuenta de Google no está registrada. Registrate primero desde el formulario.');
    }
    
    return {
      uid: user.uid,
      isAdmin: userRole.isAdmin,
      isStudent: userRole.isStudent,
      token,
    };
  } catch (error) {
    console.error('Error en login con Google:', error);
    
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError('No se pudo iniciar sesión con Google.');
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error en logout:', error);
    throw new AuthError('Error al cerrar sesión.');
  }
};

// Recuperar contraseña
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error enviando email de recuperación:', error);
    throw new AuthError('No pudimos enviar el correo. Verificá que el email sea correcto.');
  }
};

// Función para obtener el token del usuario actual
export const getCurrentUserToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
};

// Función para verificar si el usuario actual es admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    const token = await user.getIdToken();
    const userRole = await getUserRole(user.uid, token);
    return userRole.isAdmin;
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
};

// Hook para escuchar cambios en el estado de autenticación
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Función para obtener el usuario actual
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};