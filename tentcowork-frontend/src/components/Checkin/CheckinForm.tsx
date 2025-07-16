import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, CheckCircle, XCircle,
  ArrowRight, Delete, Mail, Users
} from 'lucide-react';
import {
  checkInOrOut,
  checkStudentStatus,
  recoverCodeByEmail
} from '../../services/checkInService';

interface CheckInResult {
  success: boolean;
  message: string;
  action?: 'check-in' | 'check-out';
  time?: string;
  duration?: string;
  user?: {
    name: string;
    email: string;
    plan: string;
  };
  recovery?: boolean;
}

type NumericKeypadProps = {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
};

const NumericKeypad: React.FC<NumericKeypadProps> = ({ onKeyPress, onDelete, onSubmit }) => {
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']];
  return (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {keys.flat().map(key => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onKeyPress(key)}
          className="h-16 bg-white border-2 border-gray-200 rounded-xl text-2xl font-semibold text-gray-800 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm"
        >
          {key}
        </motion.button>
      ))}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDelete}
        className="h-16 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 shadow-sm flex items-center justify-center"
      >
        <Delete size={24} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSubmit}
        className="h-16 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-200 shadow-sm flex items-center justify-center"
      >
        <ArrowRight size={24} />
      </motion.button>
    </div>
  );
};

export const CheckInForm = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleKeyPress = (key: string) => {
    if (code.length !== 5) {
      setCode(prev => prev + key);
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (code.length < 3) return;

    setLoading(true);
    setResult(null);

    try {
      const student = await checkStudentStatus(code);
      const { mensaje, estado } = await checkInOrOut(code);

      setResult({
        success: estado !== 'rechazado',
        message: mensaje,
        action: estado === 'entrada' ? 'check-in' : 'check-out',
        time: new Date().toLocaleTimeString(),
        user: {
          name: student.fullName,
          email: student.email,
          plan: student.membresia.tipo
        }
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }

    setLoading(false);
  };

  const handleRecovery = async () => {
    setLoading(true);
    try {
      const codigo = await recoverCodeByEmail(recoveryEmail);

      setResult({
        success: true,
        message: `Tu código de acceso es: ${codigo}`,
        recovery: true
      });

      setShowRecovery(false);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error al recuperar el código'
      });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setResult(null);
    setShowRecovery(false);
    setRecoveryEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-auto"
      >
        
        {/* Header */}
        <div className="text-center mb-1">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-lg mx-auto mb-6">
            <img
              src="public/logorecortadoo.jpg"
              alt="Logo Tent"
              className="object-cover w-full h-full"
            />
          </div>

          <h1 className="text-3xl font-bold text-tent-orange mb-2">Check-in / Check-out</h1>
          <h2 className="text-2xl font-bold text-tent-green mb-3">Estudiantes</h2>
          <p className="text-gray-600 text-base">Ingresa tu código de acceso</p>
        </div>
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
              <p className="text-white text-lg font-medium">Cargando...</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showRecovery ? (
            <motion.div key="checkin" className="space-y-6">
              {/* Código */}
              <div className="relative">
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-blue-400 transition-all duration-200">
                  <div className="flex items-center space-x-2">
                    <User className="text-gray-400" size={20} />
                    <input
                      type="text"
                      value={code}
                      readOnly
                      placeholder="Código de acceso"
                      className="bg-transparent text-2xl font-mono text-center flex-1 focus:outline-none text-gray-800"
                    />
                  </div>
                </div>
                <div className="flex justify-center mt-3 space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${i < code.length ? 'bg-tent-orange' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>

              <NumericKeypad
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                onSubmit={handleSubmit}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRecovery(true)}
                className="w-full py-3 text-tent-orange font-medium hover:underline rounded-xl transition-all duration-200"
              >
                ¿Olvidaste tu código?
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="recovery" className="space-y-6">
              <div className="text-center mb-5">
                <Mail className="text-tent-orange mx-auto mb-2" size={32} />
                <h2 className="text-xl font-semibold text-gray-800">Recuperar código</h2>
                <p className="text-gray-600 text-sm">Ingresa tu email registrado</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                <div className="flex items-center space-x-2">
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
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRecovery(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRecovery}
                  disabled={!recoveryEmail || loading}
                  className="w-full py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-yellow-600 transition-all duration-200">
                  Enviar
                </motion.button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal de resultado */}
      <AnimatePresence>
        {result && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              className={`rounded-3xl p-8 max-w-sm w-full text-center ${
                result.recovery ? 'bg-white text-tent-green' : 'bg-white'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.success ? 'bg-tent-green' : 'bg-red-100'
              }`}>
                {result.success ? (
                  <CheckCircle className={result.recovery ? 'text-white' : 'text-green-600'} size={32} />
                ) : (
                  <XCircle className="text-red-600" size={32} />
                )}
              </div>

              {result.recovery ? (
                <div className="mb-6">
                  <Mail className="text-white mx-auto mb-2" size={32} />
                  <h3 className="text-xl font-semibold mb-2">Código encontrado</h3>
                  <p>{result.message}</p>
                </div>
              ) : result.success && result.user ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {result.action === 'check-in' ? '¡Bienvenido!' : '¡Hasta pronto!'}
                  </h3>
                  <p className="text-gray-600 mb-4">{result.user.name}</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium capitalize">{result.user.plan}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Hora:</span>
                      <span className="font-medium">{result.time}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
                  <p className="text-gray-600">{result.message}</p>
                </>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetForm}
                className="w-full py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-yellow-600 transition-all duration-200"
              >
                Continuar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckInForm;
