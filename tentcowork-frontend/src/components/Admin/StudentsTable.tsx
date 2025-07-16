import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  Mail,
  Phone,
  GraduationCap,
  Award,
  Eye,
  Trash2,
  Download,
  User,
  Save,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  university?: string; // Campo legacy para compatibilidad
  carrera?: string;
  certificado: boolean;
  plan?: string; // Este es el campo principal para el plan
  membresia?: {
    nombre?: string;
    estado?: string;
    montoPagado?: number;
    medioPago?: string;
  };
  profilePhoto?: string;
  lastActivity?: string;
  joinDate?: string;
  createdAt?: string;
  accessCode?: string;
  activo?: boolean;
  isCheckedIn?: boolean;
  lastCheckInTimestamp?: any;
  fotoURL?: string;
}

interface EditFormData {
  fullName: string;
  email: string;
  phone: string;
  university: string;
  carrera: string;
  certificado: boolean;
  plan: string;
  [key: string]: any; // Permitir propiedades adicionales para Firebase
}

// Universidades disponibles
const universities = [
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
];

// Planes disponibles
const planes = [
  { value: 'full', label: 'Full' },
  { value: 'partime', label: 'Part-time' },
  { value: 'diario', label: 'Diario' },
];

const StudentsTable = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'fullName', direction: 'asc' });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    fullName: '',
    email: '',
    phone: '',
    university: '',
    carrera: '',
    certificado: false,
    plan: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteMultipleConfirm, setShowDeleteMultipleConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    university: '',
    planStatus: '',
    carrera: '',
    certificado: '',
    plan: '',
  });

  // Función helper para obtener la universidad (compatibilidad con university)
  const getStudentuniversity = (student: Student) => {
    return student.university || '';
  };

  // Función helper para obtener el label de la universidad
  const getuniversityLabel = (value: string) => {
    const uni = universities.find(u => u.value === value);
    return uni ? uni.label : value;
  };

  // Función helper para obtener el estado de membresía
  const getMembershipStatus = (student: Student) => {
    if (student.membresia?.estado) return student.membresia.estado;
    if (student.activo === true) return 'activa';
    if (student.activo === false) return 'no pagado';
    return 'pendiente';
  };

  // Función helper para obtener el nombre de membresía
  const getMembershipName = (student: Student) => {
    return student.membresia?.nombre || student.plan || 'Sin plan';
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'students'));
        const studentsData: Student[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];
        setStudents(studentsData);
      } catch (error) {
        console.error("Error al obtener estudiantes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Filtrado y ordenamiento optimizado con useMemo
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const matchesName = student.fullName?.toLowerCase().includes(filters.name.toLowerCase());
      const studentuniversity = getStudentuniversity(student);
      const matchesuniversity = studentuniversity?.toLowerCase().includes(filters.university.toLowerCase());
      const matchesCarrera = !filters.carrera || student.carrera?.toLowerCase().includes(filters.carrera.toLowerCase());
      const membershipStatus = getMembershipStatus(student);
      const matchesPlanStatus = !filters.planStatus || membershipStatus === filters.planStatus;
      const matchesCertificado = !filters.certificado || 
        (filters.certificado === 'true' && student.certificado) ||
        (filters.certificado === 'false' && !student.certificado);
      const matchesPlan = !filters.plan || student.plan === filters.plan;
      
      return matchesName && matchesuniversity && matchesCarrera && matchesPlanStatus && matchesCertificado && matchesPlan;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'university') {
        aValue = getStudentuniversity(a);
        bValue = getStudentuniversity(b);
      } else {
        aValue = a[sortConfig.key as keyof Student];
        bValue = b[sortConfig.key as keyof Student];
      }

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
    return filtered;
  }, [students, filters, sortConfig]);

  // Paginación
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedStudents, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(paginatedStudents.map(s => s.id)));
    }
  }, [paginatedStudents, selectedStudents]);

  const handleSelectStudent = useCallback((studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  }, [selectedStudents]);

  // Función para exportar a Excel
  const handleExportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const dataToExport = filteredAndSortedStudents.map(student => ({
        'Nombre Completo': student.fullName,
        'Email': student.email,
        'Teléfono': student.phone || 'No registrado',
        'Universidad': getuniversityLabel(getStudentuniversity(student)),
        'Carrera': student.carrera || 'No especificada',
        'Plan Contratado': student.plan || 'Sin plan',
        'Estado Membresía': student.membresia?.estado || 'No definido',
        'Tipo Membresía': student.membresia?.nombre || 'No definido',
        'Certificado': student.certificado ? 'Alumno Regular' : 'No certificado',
        'Monto Pagado': student.membresia?.montoPagado || 0,
        'Medio de Pago': student.membresia?.medioPago || 'No especificado',
        'Fecha de Registro': student.joinDate || 'No registrada',
        'Última Actividad': student.lastActivity || 'No registrada'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 25 }, // Nombre Completo
        { wch: 30 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 35 }, // Universidad
        { wch: 25 }, // Carrera
        { wch: 15 }, // Plan Contratado
        { wch: 15 }, // Estado Membresía
        { wch: 15 }, // Tipo Membresía
        { wch: 15 }, // Certificado
        { wch: 12 }, // Monto Pagado
        { wch: 15 }, // Medio de Pago
        { wch: 15 }, // Fecha de Registro
        { wch: 15 }  // Última Actividad
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
      
      const fileName = `estudiantes_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setExporting(false);
    }
  }, [filteredAndSortedStudents]);

  // Función para iniciar la edición
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student.id);
    setEditFormData({
      fullName: student.fullName,
      email: student.email,
      phone: student.phone || '',
      university: getStudentuniversity(student),
      carrera: student.carrera || '',
      certificado: student.certificado,
      plan: student.plan || ''
    });
  };

  // Función para guardar cambios - CORREGIDA
  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    
    setUpdating(true);
    try {
      const studentRef = doc(db, 'students', editingStudent);
      
      // DEBUG: Verifica qué datos se van a actualizar
      console.log('Datos a actualizar:', editFormData);
      console.log('Plan a actualizar:', editFormData.plan);
      
      const updateData = { ...editFormData } as Partial<Student>;
      await updateDoc(studentRef, updateData);
      
      // Actualizar el estado local
      setStudents(prev => prev.map(student => 
        student.id === editingStudent 
          ? { ...student, ...editFormData }
          : student
      ));
      
      console.log('Estudiante actualizado exitosamente');
      
      setEditingStudent(null);
      setEditFormData({
        fullName: '',
        email: '',
        phone: '',
        university: '',
        carrera: '',
        certificado: false,
        plan: ''
      });
    } catch (error) {
      console.error("Error al actualizar estudiante:", error);
    } finally {
      setUpdating(false);
    }
  };

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditFormData({
      fullName: '',
      email: '',
      phone: '',
      university: '',
      carrera: '',
      certificado: false,
      plan: ''
    });
  };

  // Función para eliminar estudiante
  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(student => student.id !== studentId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error al eliminar estudiante:", error);
    }
  };

  // Función para eliminar múltiples estudiantes
  const handleDeleteMultipleStudents = async () => {
    try {
      const deletePromises = Array.from(selectedStudents).map(studentId => 
        deleteDoc(doc(db, 'students', studentId))
      );
      
      await Promise.all(deletePromises);
      
      setStudents(prev => prev.filter(student => !selectedStudents.has(student.id)));
      setSelectedStudents(new Set());
      setShowDeleteMultipleConfirm(false);
    } catch (error) {
      console.error("Error al eliminar estudiantes:", error);
    }
  };

  // Función para alternar certificado
  const toggleCertificado = async (studentId: string, currentValue: boolean) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, { certificado: !currentValue });
      
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, certificado: !currentValue }
          : student
      ));
    } catch (error) {
      console.error("Error al actualizar certificado:", error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activa': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendiente': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'no pagado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'activa': return <CheckCircle size={14} />;
      case 'pendiente': return <AlertCircle size={14} />;
      case 'no pagado': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'full': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'partime': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'diario': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const stats = useMemo(() => {
    const total = filteredAndSortedStudents.length;
    const certificados = filteredAndSortedStudents.filter(s => s.certificado).length;
    const activos = filteredAndSortedStudents.filter(s => getMembershipStatus(s) === 'activa').length;
    const conPlan = filteredAndSortedStudents.filter(s => {
      const plan = s.plan;
      return plan && plan !== '';
    }).length;
    
    return { total, certificados, activos, conPlan };
  }, [filteredAndSortedStudents]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
    >
      {/* Header con estadísticas */}
        <div className="bg-gradient-to-r from-tent-orange to-tent-orange p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-xl p-2">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Estudiantes Registrados</h2>
                <p className="text-orange-100 text-sm">Gestión de estudiantes y membresías</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Filter size={16} />
                <span>Filtros</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Eye size={16} />
                <span>{viewMode === 'table' ? 'Tarjetas' : 'Tabla'}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportToExcel}
                disabled={exporting}
                className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <Download size={16} />
                <span>{exporting ? 'Exportando...' : 'Exportar Excel'}</span>
              </motion.button>
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.total}</div>
            <div className="text-white/80 text-sm">Total</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.certificados}</div>
            <div className="text-white/80 text-sm">Regulares</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.activos}</div>
            <div className="text-white/80 text-sm">Activos</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.conPlan}</div>
            <div className="text-white/80 text-sm">Con Plan</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 border-b border-gray-200 p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar nombre..."
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filters.university}
                onChange={(e) => setFilters({ ...filters, university: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todas las universidades</option>
                {universities.map(uni => (
                  <option key={uni.value} value={uni.value}>{uni.label}</option>
                ))}
              </select>
              
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todos los planes</option>
                {planes.map(plan => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
              
              <select
                value={filters.planStatus}
                onChange={(e) => setFilters({ ...filters, planStatus: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="activa">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="no pagado">No pagado</option>
              </select>
              
              <select
                value={filters.certificado}
                onChange={(e) => setFilters({ ...filters, certificado: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Tipo de alumno</option>
                <option value="true">Alumno Regular</option>
                <option value="false">No certificado</option>
              </select>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-1">
        {/* Acciones masivas */}
        {selectedStudents.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800">
                {selectedStudents.size} estudiante(s) seleccionado(s)
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={handleExportToExcel}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Exportar seleccionados
                </button>
                <button 
                  onClick={() => setShowDeleteMultipleConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Eliminar seleccionados
                </button>
              </div>
            </div>
          </div>
        )}
 
        {viewMode === 'table' ? (
          /* Vista de tabla */
       <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-[#014023] to-tent-green">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-tent-green text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-medium text-white cursor-pointer hover:bg-green-900"
                    onClick={() => handleSort('fullName')}
                  >
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-white">Teléfono</th>
                  <th 
                    className="px-4 py-3 text-left font-medium text-white cursor-pointer hover:bg-green-900"
                    onClick={() => handleSort('university')}
                  >
                    Universidad
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-white">Carrera</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Tipo Alumno</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editFormData.fullName}
                            onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">{student.fullName}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone size={14} className="mr-1" />
                          {student.phone || 'No registrado'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <select
                          value={editFormData.university}
                          onChange={(e) => setEditFormData({...editFormData, university: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {universities.map(uni => (
                            <option key={uni.value} value={uni.value}>{uni.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">
                          {getuniversityLabel(getStudentuniversity(student))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <input
                          type="text"
                          value={editFormData.carrera}
                          onChange={(e) => setEditFormData({...editFormData, carrera: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{student.carrera || 'No especificada'}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <select
                          value={editFormData.plan}
                          onChange={(e) => setEditFormData({...editFormData, plan: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Sin plan</option>
                          {planes.map(plan => (
                            <option key={plan.value} value={plan.value}>{plan.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(student.plan || 'Sin plan')}`}>
                          <CreditCard size={12} className="mr-1" />
                          {planes.find(p => p.value === student.plan)?.label || student.plan || 'Sin plan'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(getMembershipStatus(student))}`}>
                        {getEstadoIcon(getMembershipStatus(student))}
                        <span className="ml-1">{getMembershipStatus(student)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleCertificado(student.id, student.certificado)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          student.certificado ? 'bg-green-100 text-tent-green hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        <Award size={12} className="mr-1" />
                        {student.certificado ? 'Alumno Regular' : 'No certificado'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      {editingStudent === student.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updating}
                            className="text-green-600 hover:text-tent-green p-1 rounded disabled:opacity-50"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(student.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          /* Vista de tarjetas */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedStudents.map((student) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      {student.profilePhoto ? (
                        <img
                          src={student.profilePhoto}
                          alt={student.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      {editingStudent === student.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editFormData.fullName}
                            onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                          />
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-gray-900 mb-1">{student.fullName}</h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {student.email}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => handleSelectStudent(student.id)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-2" />
                    {editingStudent === student.id ? (
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      student.phone || 'No registrado'
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <GraduationCap size={14} className="mr-2" />
                    {editingStudent === student.id ? (
                      <select
                        value={editFormData.university}
                        onChange={(e) => setEditFormData({...editFormData, university: e.target.value})}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {universities.map(uni => (
                          <option key={uni.value} value={uni.value}>{uni.label}</option>
                        ))}
                      </select>
                    ) : (
                      getuniversityLabel(getStudentuniversity(student))
                    )}
                  </div>
                  
                  {(student.carrera || editingStudent === student.id) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📚</span>
                      {editingStudent === student.id ? (
                        <input
                          type="text"
                          value={editFormData.carrera}
                          onChange={(e) => setEditFormData({...editFormData, carrera: e.target.value})}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        student.carrera
                      )}
                    </div>
                  )}
                  
                  {/* Plan contratado */}
                  <div className="flex items-center justify-between mt-3">
                    {editingStudent === student.id ? (
                      <select
                        value={editFormData.plan}
                        onChange={(e) => setEditFormData({...editFormData, plan: e.target.value})}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Sin plan</option>
                        {planes.map(plan => (
                          <option key={plan.value} value={plan.value}>{plan.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(student.plan || 'Sin plan')}`}>
                        <CreditCard size={12} className="mr-1" />
                        {planes.find(p => p.value === student.plan)?.label || student.plan || 'Sin plan'}
                      </span>
                    )}
                  </div>
                  
                  {/* Estado y certificado */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(getMembershipStatus(student))}`}>
                      {getEstadoIcon(getMembershipStatus(student))}
                      <span className="ml-1">{getMembershipStatus(student)}</span>
                    </span>
                    
                    {editingStudent === student.id ? (
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editFormData.certificado}
                          onChange={(e) => setEditFormData({...editFormData, certificado: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-xs">Regular</span>
                      </label>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        student.certificado ? 'bg-green-100 text-tent-green' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <Award size={12} className="mr-1" />
                        {student.certificado ? 'Regular' : 'No cert.'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">
                    {student.membresia?.nombre || student.plan || 'Sin plan'}
                  </span>
                  <div className="flex space-x-2">
                    {editingStudent === student.id ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          disabled={updating}
                          className="text-green-600 hover:text-tent-green p-1 rounded disabled:opacity-50"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditStudent(student)}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(student.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Paginación */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedStudents.length)} de {filteredAndSortedStudents.length} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación individual */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
                  <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteStudent(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación de eliminación múltiple */}
      <AnimatePresence>
        {showDeleteMultipleConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteMultipleConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación múltiple</h3>
                  <p className="text-sm text-gray-600">
                    Se eliminarán {selectedStudents.size} estudiante(s). Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteMultipleConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteMultipleStudents}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Eliminar {selectedStudents.size} estudiante(s)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentsTable;