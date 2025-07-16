import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, GraduationCap,
  Building, Lock, CheckCircle, UserPlus,
  ChevronDown, Check, Search
} from 'lucide-react';
import { auth, db } from '../../utils/firebase';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface University {
  value: string;
  label: string;
}

interface FormData {
  nombre: string;
  universidad: string;
  carrera: string;
  telefono: string;
  email: string;
  password: string;
}

interface InputFieldProps {
  icon: React.ElementType;
  type?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  required?: boolean;
  autoComplete?: string;
  children?: React.ReactNode;
}

// Mover componentes fuera del componente principal para evitar recreaciones
const InputField: React.FC<InputFieldProps> = React.memo(({
  icon: Icon,
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  children
}) => (
  <div className="relative">
    <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-tent-orange transition-all duration-200">
      <div className="flex items-center space-x-3">
        <Icon className="text-gray-400" size={20} />
        {children && React.Children.count(children) > 0 ? children : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            className="bg-transparent text-lg flex-1 focus:outline-none text-gray-800 placeholder-gray-500"
          />
        )}
      </div>
    </div>
  </div>
));

const CustomSelect: React.FC<{
  universities: University[];
  selectedValue: string;
  onSelect: (university: University) => void;
}> = React.memo(({ universities, selectedValue, onSelect }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUniversities = universities.filter(uni =>
    uni.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUniversitySelect = (university: University) => {
    onSelect(university);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const selectedUni = universities.find(uni => uni.value === selectedValue);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 focus-within:border-tent-orange transition-all duration-200">
        <div className="flex items-center space-x-3">
          <Building className="text-gray-400" size={20} />
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-transparent text-lg flex-1 focus:outline-none text-left"
          >
            <span className={selectedUni ? 'text-gray-800' : 'text-gray-500'}>
              {selectedUni ? selectedUni.label : 'Seleccioná tu universidad'}
            </span>
          </button>
          <motion.div
            animate={{ rotate: isDropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="text-gray-400" size={20} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-80 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <Search className="text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar universidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-sm flex-1 focus:outline-none text-gray-800 placeholder-gray-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-60 custom-scrollbar">
              {filteredUniversities.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron universidades
                </div>
              ) : (
                filteredUniversities.map((university) => (
                  <motion.button
                    key={university.value}
                    type="button"
                    onClick={() => handleUniversitySelect(university)}
                    className="w-full p-4 text-left hover:bg-tent-orange hover:bg-opacity-10 transition-all duration-200 flex items-center justify-between group"
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-gray-800 text-sm font-medium group-hover:text-tent-orange">
                      {university.label}
                    </span>
                    {selectedValue === university.value && (
                      <Check className="text-tent-orange" size={16} />
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    nombre: '',
    universidad: '',
    carrera: '',
    telefono: '',
    email: '',
    password: ''
  });
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');


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

  // Memoizar funciones para evitar recreaciones
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleUniversitySelect = useCallback((university: University) => {
    setForm(prev => ({ ...prev, universidad: university.value }));
    if (error) setError('');
  }, [error]);

  const generateAccessCode = useCallback((): string => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Iniciando registro...');
      console.log('Form data:', form);
      
      // Primero crear el usuario en Firebase Auth
      console.log('Creando usuario en Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = userCredential.user.uid;
      console.log('Usuario creado con UID:', uid);
      
      const newCode = generateAccessCode();
      console.log('Código generado:', newCode);

      const studentData = {
        uid,
        fullName: form.nombre,
        university: form.universidad,
        carrera: form.carrera,
        phone: form.telefono,
        email: form.email,
        accessCode: newCode,
        isCheckedIn: false,
        plan: null,
        activo: false,
        role: "student",
        createdAt: serverTimestamp(),
        lastCheckInTimestamp: null
      };

      console.log('Datos a guardar en Firestore:', studentData);
      
      // Crear el documento en Firestore
      console.log('Guardando en Firestore...');
      const docRef = await addDoc(collection(db, 'students'), studentData);
      console.log('Documento creado con ID:', docRef.id);

      setAccessCode(newCode);
      console.log('Registro completado exitosamente');
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del email no es válido.');
      } else if (err.code === 'permission-denied') {
        setError('Error de permisos. Revisa las reglas de Firebase.');
      } else {
        setError(`Error: ${err.message}`);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg font-medium">Registrando...</p>
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
              src="public/logorecortadoo.jpg"
              alt="Logo Tent"
              className="object-cover w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-tent-orange mb-2">Cowork Estudiantes</h1>
          <p className="text-gray-600 text-base">Completa tus datos para comenzar</p>
        </div>

        <AnimatePresence mode="wait">
          {accessCode ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-tent-green flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-white" size={32} />
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">¡Registro exitoso!</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-600 mb-2">Tu código de acceso es:</p>
                  <p className="text-3xl font-bold text-tent-orange font-mono tracking-wider">{accessCode}</p>
                </div>
                <p className="text-sm text-gray-600">
                  Guarda este código, lo necesitarás para hacer check-in
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/Profile')}
                className="w-full py-3 bg-tent-orange text-white rounded-xl font-medium hover:bg-yellow-600 transition-all duration-200"
              >
                Ir al perfil
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <InputField
                icon={User}
                name="nombre"
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={handleChange}
                required
                autoComplete="name"
              />

              <CustomSelect
                universities={universities}
                selectedValue={form.universidad}
                onSelect={handleUniversitySelect}
              />

              <InputField
                icon={GraduationCap}
                name="carrera"
                placeholder="Carrera"
                value={form.carrera}
                onChange={handleChange}
                required
                autoComplete="off"
              />

              <InputField
                icon={Phone}
                type="tel"
                name="telefono"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={handleChange}
                required
                autoComplete="tel"
              />

              <InputField
                icon={Mail}
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />

              <InputField
                icon={Lock}
                type="password"
                name="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-tent-orange text-white rounded-xl font-medium hover:bg-yellow-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <UserPlus size={20} />
                <span>Registrarme</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 text-tent-orange font-medium hover:underline rounded-xl transition-all duration-200"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}