import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, GraduationCap, Edit3, Save, X, 
  Key, CheckCircle, ChevronDown, Send, Camera, Upload, Trash2
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../../utils/firebase';

interface University {
  value: string;
  label: string;
}

interface Estudiante {
  uid: string; // Este es el ID del documento en Firestore
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  accessCode: string;
  fotoURL?: string | null; // Ahora permite null
}

interface EditProfileProps {
  estudiante: Estudiante;
  onUpdate: (updatedEstudiante: Estudiante) => void;
  onMessage: (message: string) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ estudiante, onUpdate, onMessage }) => {
  // Lista de universidades/facultades
  const universities = useCallback(() => [
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
  const [isEditing, setIsEditing] = useState(false); // Controla solo la edición de los datos personales
  const [loading, setLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: estudiante.fullName,
    email: estudiante.email,
    phone: estudiante.phone,
    university: estudiante.university,
    carrera: estudiante.carrera,
  });

  // Efecto para actualizar formData y previewUrl cuando el estudiante prop cambia o se abre/cierra el modal
  useEffect(() => {
    if (estudiante) {
      setFormData({
        fullName: estudiante.fullName,
        email: estudiante.email,
        phone: estudiante.phone,
        university: estudiante.university,
        carrera: estudiante.carrera,
      });
      // Importante: Resetear la previsualización y el archivo seleccionado
      // a la foto original del estudiante (o null si no hay) cuando el modal se abre
      // o cuando el objeto estudiante cambia desde el padre.
      setPreviewUrl(estudiante.fotoURL || null);
      setSelectedFile(null); 
    }
  }, [estudiante, isOpen]); // Depende de estudiante y si el modal está abierto/cerrado

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        onMessage('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onMessage('La imagen debe ser menor a 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhoto = async (currentFotoURL: string | null | undefined): Promise<string | null> => {
    if (!selectedFile) return currentFotoURL || null; // Si no hay archivo nuevo, devuelve la URL actual o null
    if (!auth.currentUser) {
      onMessage('Error: Debes iniciar sesión para subir una foto.');
      console.error('Error: auth.currentUser es null. No se puede subir la foto.'); // Agregado para depuración
      throw new Error('User not authenticated for photo upload.'); // Lanzar error para detener el proceso
    }

     const userAuthUid = auth.currentUser.uid;  
    
 

    setPhotoLoading(true);
    try {
      // Eliminar foto anterior si existe y no es la previsualización de una foto nueva (para evitar doble eliminación)
      if (currentFotoURL && currentFotoURL.includes('firebase') && currentFotoURL.includes(userAuthUid) && currentFotoURL !== previewUrl) {
          try {
            const oldPhotoRef = ref(storage, currentFotoURL);
           
            await deleteObject(oldPhotoRef);
          } catch (error) {
            console.log('DEBUG: No se pudo eliminar la foto antigua de Storage, continuando...', error); // Agregado para depuración
          }
      }

      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      // ESTA ES LA LÍNEA CRÍTICA: Asegúrate de que usa userUid
      const fileName = `profile-photos/${userAuthUid}/${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, fileName);

    

      const uploadResult = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      onMessage('Error al subir la foto. Intenta nuevamente.');
      throw error;
    } finally {
      setPhotoLoading(false);
    }
  };

  const deleteProfilePhoto = async () => {
    // Si no hay foto actual en estudiante y no hay archivo seleccionado, no hay nada que eliminar.
    // Si hay un archivo seleccionado, simplemente lo "cancelamos" del estado local sin interactuar con Storage.
    if (!estudiante.fotoURL && !selectedFile) {
      return; 
    }
    
    if (selectedFile) { // Si hay un archivo pendiente de subida, solo cancelamos la selección local
      cancelPhotoSelection();
      onMessage('Selección de foto cancelada.');
      return;
    }

    // Si hay una foto existente en Firestore (estudiante.fotoURL) y no hay un selectedFile
    if (estudiante.fotoURL) {
      if (!auth.currentUser) {
        onMessage('Error: Debes iniciar sesión para eliminar una foto.');
        return;
      }

      const userUid = auth.currentUser.uid; 
      setPhotoLoading(true);
      try {
        // Solo intenta eliminar de Storage si la URL es de Firebase y pertenece al usuario actual
        if (estudiante.fotoURL.includes('firebase') && estudiante.fotoURL.includes(userUid)) {
          const oldPhotoRef = ref(storage, estudiante.fotoURL);
          await deleteObject(oldPhotoRef);
        } else {
          console.warn('Attempted to delete a photo not associated with the current user UID or not from Firebase Storage. Skipping deletion from Storage.');
        }

        // Actualizar en Firestore a null
        await updateDoc(doc(db, 'students', estudiante.uid), {
          fotoURL: null
        });

        // Actualizar el estado local y el padre
        const updatedEstudiante = { ...estudiante, fotoURL: null };
        onUpdate(updatedEstudiante);
        onMessage('Foto de perfil eliminada exitosamente');
        setPreviewUrl(null); 
      } catch (error) {
        console.error('Error deleting photo:', error);
        onMessage('Error al eliminar la foto. Intenta nuevamente.');
      } finally {
        setPhotoLoading(false);
      }
    }
  };

  const cancelPhotoSelection = () => {
    setSelectedFile(null);
    // Volver a la foto original si existía, de lo contrario, null
    setPreviewUrl(estudiante.fotoURL || null); 
  };

  const validateForm = () => {
    // Validar si el modo de edición de datos personales está activo
    // O si hay un archivo de foto seleccionado (indicando que se está intentando cambiar la foto)
    // O si la foto se eliminó (previewUrl es null y estudiante.fotoURL no lo era)
    if (isEditing || selectedFile || (previewUrl === null && estudiante.fotoURL)) { 
      if (!formData.fullName.trim()) {
        onMessage('El nombre completo es requerido');
        return false;
      }
      // El email se valida solo si ha cambiado y no es el mismo que el original
      if (formData.email !== estudiante.email && (!formData.email.trim() || !formData.email.includes('@'))) {
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
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let photoURLToSave: string | null = estudiante.fotoURL || null; // Inicia con la foto actual de estudiante o null
      let hasPhotoChanged = false;
      let hasDataChanged = false;

      // Lógica de foto: solo si hay un archivo seleccionado o si la foto original fue eliminada
      if (selectedFile) {
        // Hay un nuevo archivo para subir
        photoURLToSave = await uploadProfilePhoto(estudiante.fotoURL);
        hasPhotoChanged = true;
      } else if (previewUrl === null && estudiante.fotoURL) {
        // La foto original fue eliminada (previewUrl es null y había una foto original)
        photoURLToSave = null;
        hasPhotoChanged = true;
      }
      // Si !selectedFile y previewUrl coincide con estudiante.fotoURL, no hay cambio de foto.

      // Verificar si los datos personales han cambiado
      if (formData.fullName !== estudiante.fullName ||
          formData.email !== estudiante.email ||
          formData.phone !== estudiante.phone ||
          formData.university !== estudiante.university ||
          formData.carrera !== estudiante.carrera) {
        hasDataChanged = true;
      }

      // Solo proceder a actualizar Firestore si algo ha cambiado (foto o datos)
      if (hasPhotoChanged || hasDataChanged) {
        const updateData: any = {};

        if (hasPhotoChanged) {
          updateData.fotoURL = photoURLToSave; // Asignar la nueva URL o null
        }

        if (hasDataChanged) {
          updateData.fullName = formData.fullName;
          updateData.phone = formData.phone;
          updateData.university = formData.university;
          updateData.carrera = formData.carrera;

          // Actualizar email si cambió (manejo especial por Firebase Auth)
          if (formData.email !== estudiante.email && auth.currentUser) {
            await updateEmail(auth.currentUser, formData.email);
            updateData.email = formData.email; // Actualizar también en Firestore
          }
        }
        
        await updateDoc(doc(db, 'students', estudiante.uid), updateData);
        
        // Crear el objeto estudiante actualizado para pasar al padre
        const updatedEstudiante: Estudiante = { ...estudiante, ...formData, fotoURL: photoURLToSave };
        onUpdate(updatedEstudiante); // ¡Importante!
        onMessage('¡Perfil actualizado exitosamente!');
      } else {
        onMessage('No se detectaron cambios para guardar.');
      }

      setIsEditing(false); // Volver a modo de vista para datos personales
      setSelectedFile(null); // Limpiar selección de foto
      setPreviewUrl(photoURLToSave); // Asegurar que la previsualización refleje la foto guardada
      setIsOpen(false); // Cerrar el modal solo si todo fue exitoso
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        onMessage('Por favor, cierra sesión e inicia sesión nuevamente para cambiar el email');
      } else {
        onMessage('Error al actualizar el perfil. Intenta nuevamente.');
      }
      // No cerrar el modal si hay un error para que el usuario vea el mensaje
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!estudiante.email) {
      onMessage('No se encontró tu email para enviar la recuperación');
      return;
    }

    setPasswordResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, estudiante.email);
      onMessage('✅ Enlace de cambio de contraseña enviado a tu correo. Revisá tu bandeja de entrada y tu carpeta de spam.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      onMessage('Error al enviar el correo de recuperación. Intenta nuevamente.');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const cancelEdit = () => {
    // Restablecer formData a los valores originales del estudiante
    setFormData({
      fullName: estudiante.fullName,
      email: estudiante.email,
      phone: estudiante.phone,
      university: estudiante.university,
      carrera: estudiante.carrera,
    });
    setIsEditing(false); // Desactivar modo de edición de datos personales
    
    // Limpiar selección de foto y volver a la foto original
    setSelectedFile(null);
    setPreviewUrl(estudiante.fotoURL || null);
    setIsOpen(false); // Cerrar el modal
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm lg:text-base"
      >
        <Edit3 size={16} className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
        <span className="hidden sm:inline">Editar Perfil</span>
        <span className="sm:hidden">Editar</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl lg:rounded-2xl max-w-full sm:max-w-xl md:max-w-2xl w-full max-h-[95vh] lg:max-h-[90vh] overflow-y-auto"
            >
              {/* Header - Más compacto en móvil */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 lg:p-6 rounded-t-xl lg:rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <User size={16} className="w-4 h-4 lg:w-6 lg:h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg lg:text-2xl font-bold">Editar Perfil</h2>
                      <p className="text-blue-100 text-xs lg:text-base">Actualiza tu información personal</p>
                    </div>
                  </div>
                  {/* Botón X de cerrar, ahora con funcionalidad de guardar */}
                  <button
                    onClick={handleSaveProfile} // Llama a guardar al cerrar
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                  >
                    <X size={16} className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                {/* Foto de Perfil - Siempre visible y editable dentro del modal */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center space-x-2">
                    <Camera size={18} className="text-indigo-600 w-4 h-4 lg:w-5 lg:h-5" />
                    <span>Foto de Perfil</span>
                  </h3>

                  <div className="flex flex-col items-center space-y-4">
                    {/* Foto Actual/Preview - Centrada */}
                    <div className="relative">
                      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : ( // Si no hay previewUrl ni estudiante.fotoURL, mostrar placeholder
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                            <User size={32} className="text-gray-600 w-8 h-8 lg:w-12 lg:h-12" />
                          </div>
                        )}
                      </div>
                      
                      {photoLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {/* Controles de Foto - Stack vertical */}
                    <div className="w-full space-y-3">
                      {selectedFile ? (
                        // Vista de archivo seleccionado
                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-indigo-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs lg:text-sm font-medium text-gray-700">Archivo seleccionado:</span>
                            <button
                              onClick={cancelPhotoSelection}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                          </div>
                          <p className="text-xs lg:text-sm text-gray-600 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        // Botón para seleccionar archivo
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="profile-photo-input"
                          />
                          <label
                            htmlFor="profile-photo-input"
                            className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer text-sm lg:text-base"
                          >
                            <Upload size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            <span>Seleccionar Foto</span>
                          </label>
                        </div>
                      )}

                      {/* Botón eliminar foto actual o cancelar selección si hay archivo nuevo */}
                      {(estudiante.fotoURL || selectedFile) && ( 
                        <button
                          onClick={deleteProfilePhoto}
                          disabled={photoLoading}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 w-full justify-center text-sm lg:text-base"
                        >
                          {photoLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          )}
                          <span>{selectedFile ? 'Cancelar Selección' : 'Eliminar Foto'}</span>
                        </button>
                      )}

                      {/* Información sobre formatos */}
                      <div className="text-xs text-gray-500 bg-white bg-opacity-60 rounded-lg p-3">
                        <p>• Formatos permitidos: JPG, PNG, GIF</p>
                        <p>• Tamaño máximo: 5MB</p>
                        <p>• Recomendado: Imagen cuadrada para mejor resultado</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información Personal */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">Información Personal</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-1 lg:space-x-2 px-2 py-1 lg:px-3 lg:py-1 bg-blue-500 text-white rounded-lg text-xs lg:text-sm hover:bg-blue-600 transition-all"
                      >
                        <Edit3 size={12} className="w-3 h-3 lg:w-[14px] lg:h-[14px]" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 lg:space-y-4">
                      {/* Grid responsive - stack en móvil */}
                      <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                        <div>
                          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
                            Nombre Completo
                          </label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                            placeholder="Tu nombre completo"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                            placeholder="tu@email.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                            placeholder="Tu número de teléfono"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
                            Facultad/Institución
                          </label>
                          <div className="relative">
                            <select
                            value={formData.university}
                            onChange={(e) => handleInputChange('university', e.target.value)}
                            className="w-full px-3 py-2 pr-8 lg:pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm lg:text-base"
                            >
                              <option value="">Selecciona tu facultad/institución</option>
                              {universities().map((university) => ( // Llamar a universities()
                                <option key={university.value} value={university.value}>
                                  {university.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown 
                              size={14} 
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-3.5 h-3.5 lg:w-4 lg:h-4" 
                            />
                          </div>
                        </div>
                        
                        <div className="sm:col-span-2 lg:col-span-2">
                          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
                            Carrera
                          </label>
                          <input
                            type="text"
                            value={formData.carrera}
                            onChange={(e) => handleInputChange('carrera', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                            placeholder="Tu carrera"
                          />
                        </div>
                      </div>

                      {/* Botones de acción - Stack en móvil */}
                      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 pt-2 lg:pt-4">
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 text-sm lg:text-base"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Save size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          )}
                          <span>Guardar</span>
                        </button>
                        
                        <button
                          onClick={cancelEdit}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all text-sm lg:text-base"
                        >
                          <X size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-2 lg:gap-4 lg:space-y-0 text-xs lg:text-sm">
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <User size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <div>
                          <span className="text-gray-600">Nombre:</span>
                          <span className="font-medium ml-2">{estudiante.fullName}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <Mail size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium ml-2 break-all">{estudiante.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <Phone size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <div>
                          <span className="text-gray-600">Teléfono:</span>
                          <span className="font-medium ml-2">{estudiante.phone}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <GraduationCap size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <div>
                          <span className="text-gray-600">Facultad:</span>
                          <span className="font-medium ml-2">
                            {universities().find(u => u.value === estudiante.university)?.label || estudiante.university}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 lg:space-x-3 sm:col-span-2 lg:col-span-2">
                        <GraduationCap size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <div>
                          <span className="text-gray-600">Carrera:</span>
                          <span className="font-medium ml-2">{estudiante.carrera}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cambiar Contraseña */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-gray-800">Cambiar Contraseña</h3>
                      <p className="text-xs lg:text-sm text-gray-600">Enviaremos un enlace a tu correo para cambiar tu contraseña</p>
                    </div>
                    <Key size={20} className="text-orange-500 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>

                  <div className="bg-white bg-opacity-60 rounded-lg p-3 lg:p-4 mb-3 lg:mb-4">
                    <div className="flex items-center space-x-2 lg:space-x-3 text-xs lg:text-sm text-gray-700">
                      <Mail size={14} className="text-orange-500 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <div>
                        <span className="font-medium">Email registrado:</span>
                        <span className="ml-2 break-all">{estudiante.email}</span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePasswordReset}
                    disabled={passwordResetLoading}
                    className="flex items-center space-x-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 w-full justify-center text-sm lg:text-base"
                  >
                    {passwordResetLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <span>Enviar enlace de cambio de contraseña</span>
                      </>
                    )}
                  </motion.button>

                  <div className="mt-3 lg:mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle size={14} className="text-blue-600 mt-0.5 flex-shrink-0 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      <div className="text-xs lg:text-sm text-blue-800">
                        <p className="font-medium mb-1">¿Cómo funciona?</p>
                        <ul className="text-xs space-y-1 text-blue-700">
                          <li>• Recibirás un correo en tu email registrado</li>
                          <li>• Haz clic en el enlace del correo</li>
                          <li>• Ingresa tu nueva contraseña</li>
                          <li>• ¡Listo! Ya podés iniciar sesión con tu nueva contraseña</li>
                        </ul>
                      </div>
                    </div>
                  </div>
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
