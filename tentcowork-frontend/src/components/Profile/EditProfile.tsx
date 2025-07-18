import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, GraduationCap, Edit3, Save, X, 
  Eye, EyeOff, Lock, Key, CheckCircle, XCircle, ChevronDown
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../../utils/firebase';

interface University {
  value: string;
  label: string;
}

interface Estudiante {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string;
}

interface EditProfileProps {
  estudiante: Estudiante;
  onUpdate: (updatedEstudiante: Estudiante) => void;
  onMessage: (message: string) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ estudiante, onUpdate, onMessage }) => {
  // Lista de universidades/facultades
  const universities: University[] = React.useMemo(() => [
    { value: 'UNCUYO', label: 'Universidad Nacional de Cuyo (UNCUYO)' },
    { value: 'UTN', label: 'Universidad Tecnológica Nacional (UTN)' },
    { value: 'UM', label: 'Universidad de Mendoza (UM)' },
    { value: 'UDA', label: 'Universidad del Aconcagua (UDA)' },
    { value: 'UCH', label: 'Universidad Champagnat (UCH)' },
    { value: 'Ucongreso', label: 'Universidad de Congreso' },
    { value: 'UMaza', label: 'Universidad Juan Agustín Maza (UMaza)' },
    { value: 'UCA', label: 'Universidad Católica Argentina (UCA)' },
    { value: 'Siglo21', label: 'Universidad Siglo 21' },
    { value: 'ITU', label: 'Instituto Tecnológico Universitario (ITU - UNCUYO)' },
    { value: 'ESTIM', label: 'Instituto de Educación Superior N°9–021 (ESTIM)' },
    { value: 'ITES', label: 'Instituto Tecnológico de Educación Superior (ITES)' },
    { value: 'ISEP', label: 'Instituto de Seguridad Pública (ISEP)' },
    { value: 'Otra', label: 'Otra' }
  ], []);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: estudiante.fullName,
    email: estudiante.email,
    phone: estudiante.phone,
    university: estudiante.university,
    carrera: estudiante.carrera,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      onMessage('El nombre completo es requerido');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      onMessage('Email válido es requerido');
      return false;
    }
    if (!formData.phone.trim()) {
      onMessage('El número de teléfono es requerido');
      return false;
    }
    if (!formData.university.trim()) {
      onMessage('La facultad es requerida');
      return false;
    }
    if (!formData.carrera.trim()) {
      onMessage('La carrera es requerida');
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!passwordData.currentPassword) {
      onMessage('La contraseña actual es requerida');
      return false;
    }
    if (passwordData.newPassword.length < 6) {
      onMessage('La nueva contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onMessage('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Actualizar datos en Firestore
      await updateDoc(doc(db, 'students', estudiante.id), {
        fullName: formData.fullName,
        phone: formData.phone,
        university: formData.university,
        carrera: formData.carrera,
      });

      // Actualizar email si cambió
      if (formData.email !== estudiante.email && auth.currentUser) {
        await updateEmail(auth.currentUser, formData.email);
        await updateDoc(doc(db, 'students', estudiante.id), {
          email: formData.email,
        });
      }

      const updatedEstudiante = { ...estudiante, ...formData };
      onUpdate(updatedEstudiante);
      onMessage('¡Perfil actualizado exitosamente!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        onMessage('Por favor, cierra sesión e inicia sesión nuevamente para cambiar el email');
      } else {
        onMessage('Error al actualizar el perfil. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      if (!auth.currentUser) {
        onMessage('Usuario no autenticado');
        return;
      }

      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Cambiar contraseña
      await updatePassword(auth.currentUser, passwordData.newPassword);
      
      onMessage('¡Contraseña cambiada exitosamente!');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        onMessage('La contraseña actual es incorrecta');
      } else {
        onMessage('Error al cambiar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      fullName: estudiante.fullName,
      email: estudiante.email,
      phone: estudiante.phone,
      university: estudiante.university,
      carrera: estudiante.carrera,
    });
    setIsEditing(false);
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
      >
        <Edit3 size={18} />
        <span>Editar Perfil</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Editar Perfil</h2>
                      <p className="text-blue-100">Actualiza tu información personal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Información Personal */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Información Personal</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
                      >
                        <Edit3 size={14} />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo
                          </label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tu nombre completo"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tu@email.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tu número de teléfono"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Facultad/Institución
                          </label>
                          <div className="relative">
                            <select
                              value={formData.university}
                              onChange={(e) => handleInputChange('university', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="">Selecciona tu facultad/institución</option>
                              {universities.map((university) => (
                                <option key={university.value} value={university.value}>
                                  {university.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown 
                              size={16} 
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Carrera
                          </label>
                          <input
                            type="text"
                            value={formData.carrera}
                            onChange={(e) => handleInputChange('carrera', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tu carrera"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Save size={16} />
                          )}
                          <span>Guardar</span>
                        </button>
                        
                        <button
                          onClick={cancelEdit}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                        >
                          <X size={16} />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-3">
                        <User size={16} className="text-blue-500" />
                        <div>
                          <span className="text-gray-600">Nombre:</span>
                          <span className="font-medium ml-2">{estudiante.fullName}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Mail size={16} className="text-blue-500" />
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium ml-2">{estudiante.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Phone size={16} className="text-blue-500" />
                        <div>
                          <span className="text-gray-600">Teléfono:</span>
                          <span className="font-medium ml-2">{estudiante.phone}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <GraduationCap size={16} className="text-blue-500" />
                        <div>
                          <span className="text-gray-600">Facultad:</span>
                          <span className="font-medium ml-2">
                            {universities.find(u => u.value === estudiante.university)?.label || estudiante.university}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 md:col-span-2">
                        <GraduationCap size={16} className="text-blue-500" />
                        <div>
                          <span className="text-gray-600">Carrera:</span>
                          <span className="font-medium ml-2">{estudiante.carrera}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cambiar Contraseña */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Seguridad</h3>
                    {!showPasswordForm && (
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="flex items-center space-x-2 px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-all"
                      >
                        <Key size={14} />
                        <span>Cambiar Contraseña</span>
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showPasswordForm ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña Actual
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="Tu contraseña actual"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nueva Contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="Tu nueva contraseña (mín. 6 caracteres)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirmar Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Confirma tu nueva contraseña"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Lock size={16} />
                            )}
                            <span>Cambiar Contraseña</span>
                          </button>
                          
                          <button
                            onClick={() => setShowPasswordForm(false)}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                          >
                            <X size={16} />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <Lock size={16} className="text-orange-500" />
                        <span>Haz clic en "Cambiar Contraseña" para actualizar tu contraseña</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EditProfile;