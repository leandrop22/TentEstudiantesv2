import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../../utils/firebase';
import { Mail, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setResetMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMsg('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCredential.user.uid;

      const adminRef = doc(db, 'admin', uid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        navigate('/admin');
        return;
      }

      const studentQuery = query(collection(db, 'students'), where('uid', '==', uid));
      const studentSnap = await getDocs(studentQuery);

      if (!studentSnap.empty) {
        const studentData = studentSnap.docs[0].data();
        if (studentData.rol === 'admin') {
          navigate('/admin');
        } else {
          navigate('/profile');
        }
        return;
      }

      setError('Tu cuenta no está registrada correctamente.');
      await signOut(auth);
    } catch (err) {
      console.error(err);
      setError('Login fallido. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const emailToUse = showRecovery ? recoveryEmail : form.email;

    if (!emailToUse) {
      setError('Ingresá tu email para recuperar la contraseña.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      setResetMsg('Enlace enviado. Revisá tu correo y tu carpeta de spam.');
      setError('');
      if (showRecovery) {
        setShowRecovery(false);
        setRecoveryEmail('');
      }
    } catch (err) {
      console.error(err);
      setError('No pudimos enviar el correo. Verificá que el email sea correcto.');
      setResetMsg('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setResetMsg('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;

      
      try {
        const res = await fetch(`${backendUrl}/is-admin/${uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isAdmin) {
            navigate('/admin');
            return;
          }
        }
      } catch (apiError) {
        console.error('Error checking admin status:', apiError);
        // Continuar con verificación local si falla la API
      }

      // Verificar si es estudiante en Firestore
      const studentQuery = query(collection(db, 'students'), where('uid', '==', uid));
      const studentSnap = await getDocs(studentQuery);
      if (!studentSnap.empty) {
        const studentData = studentSnap.docs[0].data();
        if (studentData.rol === 'admin') {
          navigate('/admin');
        } else {
          navigate('/profile');
        }
        return;
      }

      setError('Tu cuenta de Google no está registrada. Registrate primero desde el formulario.');
      await signOut(auth);

    } catch (err) {
      console.error(err);
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg font-medium">Cargando...</p>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-auto"
      >
        <div className="text-center mb-8">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-lg mx-auto mb-6">
            <img
              src="/tent_icon_512.png"
              alt="Logo Tent"
              className="object-cover w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-tent-orange mb-2">Cowork Estudiantes</h1>
          <p className="text-gray-600 text-base">Ingresa a tu cuenta</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4 mb-4 flex items-center space-x-2"
            >
              <XCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          {resetMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl p-4 mb-4 flex items-center space-x-2"
            >
              <CheckCircle size={20} />
              <span>{resetMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!showRecovery ? (
            <motion.div key="login" className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-tent-orange transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <Mail className="text-gray-400" size={20} />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="tu@email.com"
                      className="bg-transparent text-lg flex-1 focus:outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-tent-orange transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <Lock className="text-gray-400" size={20} />
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="Tu contraseña"
                      className="bg-transparent text-lg flex-1 focus:outline-none text-gray-800"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    />
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-tent-orange text-white font-semibold rounded-2xl hover:bg-yellow-600 transition-all duration-200 shadow-lg disabled:opacity-70"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </motion.button>

              {/* Google Login */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 bg-gray-100 text-gray-800 font-medium rounded-full hover:bg-gray-200 transition-all duration-200 shadow-sm"
              >
                <img
                  src="/google.png"
                  alt="Google logo"
                  className="w-5 h-5"
                />
                <span><b>Iniciar sesión con Google</b></span>
              </motion.button>

              {/* Link to recovery */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowRecovery(true)}
                className="w-full py-3 text-tent-orange font-medium hover:underline rounded-xl transition-all duration-200"
              >
                ¿Olvidaste tu contraseña?
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <Mail className="text-tent-orange mx-auto mb-3" size={32} />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Recuperar contraseña
                </h2>
                <p className="text-gray-600 text-sm">
                  Ingresa tu email para recibir el enlace de recuperación
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-tent-orange transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <Mail className="text-gray-400" size={20} />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="bg-transparent text-lg flex-1 focus:outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRecovery(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePasswordReset}
                  disabled={!recoveryEmail || loading}
                  className="flex-1 py-3 bg-tent-orange text-white rounded-2xl font-medium hover:bg-yellow-600 transition-all duration-200 disabled:opacity-70"
                >
                  {loading ? 'Enviando...' : 'Enviar'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}