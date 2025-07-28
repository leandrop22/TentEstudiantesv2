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
  Mail,
  Phone,
  GraduationCap,
  Award,
  Eye,
  Trash2,
  Download,
  User,
  AlertTriangle,
  CreditCard,
  Settings,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, limit, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';

interface Student {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  university?: string;
  carrera?: string;
  certificado: boolean;
  plan?: string;
  membresia?: {
    nombre?: string;
    estado?: string;
    fechaDesde?: Timestamp;
    fechaHasta?: Timestamp;
    montoPagado?: number;
    medioPago?: string;
  };
  profilePhoto?: string;
  createdAt?: Timestamp;
  accessCode?: string;
  activo?: boolean;
  isCheckedIn?: boolean;
  lastCheckInTimestamp?: any;
  fotoURL?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  days: string;
  startHour: string;
  endHour: string;
}

interface StudentsTableProps {
  availablePlans?: Plan[];
}

// ✅ CACHE CONFIG
const CACHE_KEY = 'studentsTableCache';
const CACHE_DURATION = 12 * 60 * 1000; // 12 minutos

interface CacheData {
  students: Student[];
  lastUpdate: number;
  cacheExpiry: number;
  dataType: 'active' | 'all'; // ✅ Nuevo: tipo de datos en cache
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'No registrada';
  
  try {
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('es-AR');
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('es-AR');
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString('es-AR');
    }
    return 'No registrada';
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'No registrada';
  }
};

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

const StudentsTable: React.FC<StudentsTableProps> = ({ availablePlans = [] }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheUsed, setCacheUsed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [dataScope, setDataScope] = useState<'active' | 'all'>('active'); // ✅ Nuevo: control de alcance de datos
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'fullName', direction: 'asc' });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteMultipleConfirm, setShowDeleteMultipleConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [showAdminActions, setShowAdminActions] = useState<string | null>(null);
  const [adminAction, setAdminAction] = useState<'reset' | 'activate' | 'deactivate' | null>(null);
  const [isProcessingAdmin, setIsProcessingAdmin] = useState(false);
  
  // ✅ Filtros completos pero con estado activo por defecto
  const [filters, setFilters] = useState({
    name: '',
    university: '',
    planStatus: 'activa', // ✅ Filtro predeterminado de estudiantes activos
    carrera: '',
    certificado: '',
    plan: '',
  });

  // ✅ Cache del navegador - Cargar datos (ahora con tipo de datos)
  const loadFromCache = (requestedScope: 'active' | 'all'): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        console.log('🔍 Verificando cache de estudiantes:', {
          'Requested scope': requestedScope,
          'Cached scope': data.dataType,
          'Cache timestamp': new Date(data.lastUpdate).toLocaleString(),
          'Current time': new Date(now).toLocaleString(),
          'Cache valid': now < data.cacheExpiry
        });
        
        // ✅ Cache válido si:
        // 1. No ha expirado
        // 2. El scope coincide O tenemos 'all' y pedimos 'active' (subset válido)
        const scopeMatches = data.dataType === requestedScope || 
                           (data.dataType === 'all' && requestedScope === 'active');
        
        if (now < data.cacheExpiry && scopeMatches) {
          /* console.log('✅ Usando estudiantes desde cache'); */

          setCacheUsed(true);
          setDataScope(data.dataType);
          return data;
        } else {
          /* console.log('⏰ Cache de estudiantes inválido o scope diferente'); */

          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('❌ Error leyendo cache de estudiantes:', error);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  // ✅ Cache del navegador - Guardar datos (ahora con tipo de datos)
  const saveToCache = (studentsData: Student[], scope: 'active' | 'all') => {
    try {
      const now = Date.now();
      const dataToCache: CacheData = {
        students: studentsData,
        lastUpdate: now,
        cacheExpiry: now + CACHE_DURATION,
        dataType: scope
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
      console.log('💾 Estudiantes guardados en cache:', {
        scope,
        count: studentsData.length,
        validUntil: new Date(dataToCache.cacheExpiry).toLocaleString()
      });
      setLastUpdate(now);
      setDataScope(scope);
    } catch (error) {
      console.error('❌ Error guardando cache de estudiantes:', error);
    }
  };

  // Función para obtener los planes dinámicamente
  const planes = useMemo(() => {
    if (availablePlans.length === 0) {
      return [
        { value: 'full', label: 'Full' },
        { value: 'partime', label: 'Part-time' },
        { value: 'diario', label: 'Diario' },
      ];
    }
    
    return availablePlans.map(plan => ({
      value: plan.id,
      label: plan.name
    }));
  }, [availablePlans]);

  const getStudentUniversity = (student: Student) => {
    return student.university || '';
  };

  const getUniversityLabel = (value: string) => {
    const uni = universities.find(u => u.value === value);
    return uni ? uni.label : value;
  };

  const getMembershipStatus = (student: Student) => {
    if (student.membresia?.estado) return student.membresia.estado;
    if (student.activo === true) return 'activa';
    if (student.activo === false) return 'no pagado';
    return 'pendiente';
  };

  const getMembershipName = (student: Student) => {
    if (student.membresia?.nombre) return student.membresia.nombre;
    
    const planInfo = availablePlans.find(p => p.id === student.plan);
    if (planInfo) return planInfo.name;
    
    const staticPlan = planes.find(p => p.value === student.plan);
    if (staticPlan) return staticPlan.label;
    
    return student.plan || 'Sin plan';
  };

  // ✅ Función para determinar si necesitamos hacer fetch
  const needsFetch = (requestedScope: 'active' | 'all') => {
    // Si no hay datos, siempre fetch
    if (students.length === 0) return true;
    
    // Si pedimos 'all' pero tenemos 'active', necesitamos fetch
    if (requestedScope === 'all' && dataScope === 'active') return true;
    
    // Si pedimos 'active' y tenemos 'all', no necesitamos fetch
    return false;
  };

  // ✅ Función para determinar el scope necesario basado en filtros
  const getRequiredScope = () => {
    // Si el filtro de estado no es 'activa' o está vacío, necesitamos todos
    if (!filters.planStatus || filters.planStatus !== 'activa') {
      return 'all';
    }
    // Si solo buscamos activos, con 'active' es suficiente
    return 'active';
  };

  // ✅ Fetch optimizado con manejo inteligente de scope
  const fetchStudents = async (forceRefresh = false, requestedScope?: 'active' | 'all') => {
    try {
      setLoading(true);
      setCacheUsed(false);
      
      const scope = requestedScope || getRequiredScope();
      
      console.log('🔄 Iniciando fetch de estudiantes...', {
        scope,
        forceRefresh,
        currentDataScope: dataScope
      });
      
      // ✅ Intentar usar cache si no forzamos refresh
      if (!forceRefresh) {
        const cachedData = loadFromCache(scope);
        if (cachedData) {
          let filteredStudents = cachedData.students;
          
          // Si tenemos 'all' pero pedimos 'active', filtrar
          if (cachedData.dataType === 'all' && scope === 'active') {
            filteredStudents = cachedData.students.filter(s => 
              getMembershipStatus(s) === 'activa'
            );
            /* console.log('✂️ Filtrando estudiantes activos del cache completo'); */

          }
          
          setStudents(filteredStudents);
          setLastUpdate(cachedData.lastUpdate);
          setLoading(false);
          return;
        }
      }
      
      // ✅ Construir query según el scope
      let studentsQuery;
      
      if (scope === 'active') {
        // Solo estudiantes con membresía activa
        studentsQuery = query(
          collection(db, 'students'),
          where('membresia.estado', '==', 'activa'),
          limit(300)
        );
      } else {
        // Todos los estudiantes
        studentsQuery = query(
          collection(db, 'students'),
          limit(800) // Límite más alto para todos
        );
      }
      
      const querySnapshot = await getDocs(studentsQuery);
      const studentsData: Student[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      console.log('✅ Estudiantes obtenidos:', {
        'Total estudiantes': studentsData.length,
        'Scope aplicado': scope
      });
      
      setStudents(studentsData);
      
      // ✅ Guardar en cache
      saveToCache(studentsData, scope);

    } catch (error) {
      console.error("❌ Error al obtener estudiantes:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Efecto inicial - cargar estudiantes activos por defecto
  useEffect(() => {
    fetchStudents(false, 'active');
  }, []);

  // ✅ Efecto para manejar cambios de filtros que requieren diferente scope
  useEffect(() => {
    const requiredScope = getRequiredScope();
    
    // Solo hacer fetch si necesitamos un scope diferente al actual
    if (needsFetch(requiredScope)) {
      console.log('🔄 Cambiando scope de datos:', {
        from: dataScope,
        to: requiredScope,
        reason: 'Filter change'
      });
      fetchStudents(false, requiredScope);
    }
  }, [filters.planStatus]);

  const handleForceRefresh = () => {
    /* console.log('🔄 Forzando actualización de estudiantes...'); */

    localStorage.removeItem(CACHE_KEY);
    const requiredScope = getRequiredScope();
    fetchStudents(true, requiredScope);
  };

  const handleResetMembership = async (studentId: string) => {
    setIsProcessingAdmin(true);
    try {
      /* console.log('=== RESETEANDO MEMBRESÍA ==='); */

      /* console.log('Student ID:', studentId); */

      
      const studentRef = doc(db, 'students', studentId);
      
      const updateData = {
        plan: '',
        'membresia.nombre': '',
        'membresia.estado': '',
        'membresia.montoPagado': 0,
        'membresia.medioPago': '',
        'membresia.fechaDesde': null,
        'membresia.fechaHasta': null,
        'membresia.motivoCancelacion': null,
        'membresia.fechaCancelacion': null,
        activo: false
      };
      
      await updateDoc(studentRef, updateData);
      /* console.log('✅ Membresía reseteada exitosamente'); */

      
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { 
              ...student, 
              plan: '',
              membresia: {
                nombre: '',
                estado: '',
                montoPagado: 0,
                medioPago: ''
              },
              activo: false
            }
          : student
      ));
      
      setShowAdminActions(null);
      setAdminAction(null);
      alert('✅ Membresía reseteada. El estudiante puede contratar un nuevo plan.');
      
    } catch (error: any) {
      console.error('❌ Error al resetear membresía:', error);
      alert('Error al resetear membresía: ' + error.message);
    } finally {
      setIsProcessingAdmin(false);
    }
  };

  const handleToggleStudentStatus = async (studentId: string, newStatus: boolean) => {
    setIsProcessingAdmin(true);
    try {
      /* console.log('=== CAMBIANDO ESTADO DEL ESTUDIANTE ==='); */

      /* console.log('Student ID:', studentId); */

      /* console.log('Nuevo estado:', newStatus); */

      
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, { activo: newStatus });
      
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, activo: newStatus }
          : student
      ));
      
      setShowAdminActions(null);
      setAdminAction(null);
      alert(`✅ Estudiante ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      
    } catch (error: any) {
      console.error('❌ Error al cambiar estado:', error);
      alert('Error al cambiar estado: ' + error.message);
    } finally {
      setIsProcessingAdmin(false);
    }
  };

  const getAvailableActions = (student: Student) => {
    const actions = [];
    const membershipStatus = getMembershipStatus(student);
    
    if (membershipStatus === 'cancelada') {
      actions.push({
        id: 'reset',
        label: 'Resetear Membresía',
        icon: '🔄',
        color: 'bg-blue-500 hover:bg-blue-600',
        description: 'Limpiar membresía para permitir nueva contratación'
      });
    }
    
    if (student.activo) {
      actions.push({
        id: 'deactivate',
        label: 'Desactivar Estudiante',
        icon: '❌',
        color: 'bg-red-500 hover:bg-red-600',
        description: 'Desactivar acceso del estudiante'
      });
    } else {
      actions.push({
        id: 'activate',
        label: 'Activar Estudiante',
        icon: '✅',
        color: 'bg-green-500 hover:bg-green-600',
        description: 'Activar acceso del estudiante'
      });
    }
    
    return actions;
  };

  // ✅ Filtrado optimizado - filtra localmente
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student => {
      // ✅ Filtro por nombre
      const matchesName = !filters.name || 
        student.fullName?.toLowerCase().includes(filters.name.toLowerCase());
      
      const studentUniversity = getStudentUniversity(student);
      const matchesUniversity = !filters.university || 
        studentUniversity?.toLowerCase().includes(filters.university.toLowerCase());
      
      const matchesCarrera = !filters.carrera || 
        student.carrera?.toLowerCase().includes(filters.carrera.toLowerCase());
      
      const membershipStatus = getMembershipStatus(student);
      const matchesPlanStatus = !filters.planStatus || membershipStatus === filters.planStatus;
      
      const matchesCertificado = !filters.certificado || 
        (filters.certificado === 'true' && student.certificado) ||
        (filters.certificado === 'false' && !student.certificado);
      
      const matchesPlan = !filters.plan || student.plan === filters.plan;
      
      return matchesName && matchesUniversity && matchesCarrera && matchesPlanStatus && matchesCertificado && matchesPlan;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'university') {
        aValue = getStudentUniversity(a);
        bValue = getStudentUniversity(b);
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

  const handleExportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const dataToExport = filteredAndSortedStudents.map(student => ({
        'Nombre Completo': student.fullName,
        'Email': student.email,
        'Teléfono': student.phone || 'No registrado',
        'Universidad': getUniversityLabel(getStudentUniversity(student)),
        'Carrera': student.carrera || 'No especificada',
        'Plan Contratado': getMembershipName(student),
        'Vigencia Desde': formatDate(student.membresia?.fechaDesde),
        'Vigencia Hasta': formatDate(student.membresia?.fechaHasta),
        'Estado Membresía': student.membresia?.estado || 'No definido',
        'Tipo Membresía': student.membresia?.nombre || 'No definido',
        'Certificado': student.certificado ? 'Alumno Regular' : 'No certificado',
        'Monto Pagado': student.membresia?.montoPagado || 0,
        'Medio de Pago': student.membresia?.medioPago || 'No especificado',
        'Fecha de Registro': formatDate(student.createdAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      
      const colWidths = [
        { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 35 }, { wch: 25 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
      
      const fileName = `estudiantes_${dataScope}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setExporting(false);
    }
  }, [filteredAndSortedStudents, dataScope]);

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(student => student.id !== studentId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error al eliminar estudiante:", error);
    }
  };

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
      case 'cancelada': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'activa': return <CheckCircle size={14} />;
      case 'pendiente': return <AlertCircle size={14} />;
      case 'no pagado': return <XCircle size={14} />;
      case 'cancelada': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getPlanColor = (planId: string) => {
    if (!planId) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    const planInfo = availablePlans.find(p => p.id === planId);
    if (planInfo) {
      const hash = planInfo.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const colors = [
        'bg-purple-100 text-purple-700 border-purple-200',
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-orange-100 text-orange-700 border-orange-200',
        'bg-green-100 text-green-700 border-green-200',
        'bg-pink-100 text-pink-700 border-pink-200',
        'bg-indigo-100 text-indigo-700 border-indigo-200',
      ];
      return colors[hash % colors.length];
    }
    
    switch (planId) {
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
      <div className="min-h-96 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-tent-orange border-dashed rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">
            {cacheUsed ? 'Cargando estudiantes desde cache...' : `Cargando estudiantes ${dataScope === 'active' ? 'activos' : 'completos'}...`}
          </p>
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
              <p className="text-orange-100 text-sm flex items-center space-x-2">
                <span>
                  {dataScope === 'active' 
                    ? '🎯 Vista optimizada - Solo estudiantes activos' 
                    : '📊 Vista completa - Todos los estudiantes'
                  }
                </span>
                {cacheUsed && (
                  <span className="px-2 py-1 bg-white/20 text-orange-100 text-xs rounded-full font-medium">
                    📱 Cache activo
                  </span>
                )}
                {lastUpdate > 0 && (
                  <span className="text-xs text-orange-200">
                    Actualizado: {new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap gap-2">
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
              onClick={handleForceRefresh}
              className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Actualizar</span>
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
            <div className="text-white/80 text-sm">Total {dataScope === 'active' ? 'Activos' : 'Estudiantes'}</div>
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

      {/* ✅ FILTROS COMPLETOS - Ahora siempre disponibles */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 border-b border-gray-200 p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Buscador por nombre */}
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
              
              {/* Universidad */}
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
              
              {/* Carrera */}
              <input
                type="text"
                placeholder="Filtrar por carrera..."
                value={filters.carrera}
                onChange={(e) => setFilters({ ...filters, carrera: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              
              {/* ✅ Estado de membresía - TODOS LOS ESTADOS DISPONIBLES */}
              <select
                value={filters.planStatus}
                onChange={(e) => setFilters({ ...filters, planStatus: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">🔍 Todos los estados</option>
                <option value="activa">✅ Membresía Activa</option>
                <option value="pendiente">⏳ Pendiente</option>
                <option value="no pagado">❌ No pagado</option>
                <option value="cancelada">⚪ Cancelada</option>
              </select>
              
              {/* ✅ Filtro de plan - TODOS LOS PLANES DISPONIBLES */}
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">🏋️ Todos los planes</option>
                {planes.map(plan => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
              
              {/* Certificado */}
              <select
                value={filters.certificado}
                onChange={(e) => setFilters({ ...filters, certificado: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">🎓 Tipo de alumno</option>
                <option value="true">✅ Alumno Regular</option>
                <option value="false">❌ No certificado</option>
              </select>
            </div>
            
            {/* ✅ Información de filtros aplicados y controles */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-lg border">
                  📊 Mostrando {filteredAndSortedStudents.length} de {students.length} estudiantes
                  {dataScope === 'active' && (
                    <span className="ml-2 text-green-600 font-medium">(Solo activos cargados)</span>
                  )}
                </div>
                
                {/* Indicador de scope de datos */}
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                  dataScope === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {dataScope === 'active' ? '🎯 Datos: Solo Activos' : '📊 Datos: Completos'}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* ✅ Toggle rápido para estudiantes activos */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.planStatus === 'activa'}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      planStatus: e.target.checked ? 'activa' : '' 
                    })}
                    className="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <UserCheck size={16} />
                    <span>Solo activos</span>
                  </span>
                </label>
                
                {/* Items por página */}
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>
            
            {/* ✅ Alertas informativas */}
            {filters.planStatus !== 'activa' && filters.planStatus !== '' && dataScope === 'active' && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={16} className="text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    <strong>Cargando datos completos:</strong> Has filtrado por estado "{filters.planStatus}". 
                    Se están cargando todos los estudiantes para mostrar resultados completos.
                  </span>
                </div>
              </div>
            )}
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
                        <div>
                          <div className="font-medium text-gray-900">{student.fullName}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone size={14} className="mr-1" />
                          {student.phone || 'No registrado'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900">
                          {getUniversityLabel(getStudentUniversity(student))}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900">{student.carrera || 'No especificada'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(student.plan || '')}`}>
                          <CreditCard size={12} className="mr-1" />
                          {getMembershipName(student)}
                        </span>
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowAdminActions(student.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Acciones Administrativas"
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(student.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Eliminar estudiante"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
                      <h3 className="font-semibold text-gray-900 mb-1">{student.fullName}</h3>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Mail size={12} className="mr-1" />
                        {student.email}
                      </p>
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
                    {student.phone || 'No registrado'}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <GraduationCap size={14} className="mr-2" />
                    {getUniversityLabel(getStudentUniversity(student))}
                  </div>
                  
                  {student.carrera && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📚</span>
                      {student.carrera}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(student.plan || '')}`}>
                      <CreditCard size={12} className="mr-1" />
                      {getMembershipName(student)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(getMembershipStatus(student))}`}>
                      {getEstadoIcon(getMembershipStatus(student))}
                      <span className="ml-1">{getMembershipStatus(student)}</span>
                    </span>
                    
                    <button
                      onClick={() => toggleCertificado(student.id, student.certificado)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        student.certificado ? 'bg-green-100 text-tent-green hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <Award size={12} className="mr-1" />
                      {student.certificado ? 'Regular' : 'No cert.'}
                    </button>
                  </div>
                  
                  {getMembershipStatus(student) === 'cancelada' && (
                    <div className="mt-2 p-2 bg-gray-100 rounded-lg border border-gray-300">
                      <div className="flex items-center space-x-2">
                        <XCircle size={12} className="text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">
                          Membresía Cancelada - Requiere Reset
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">
                    {getMembershipName(student)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAdminActions(student.id)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="Acciones Administrativas"
                    >
                      <Settings size={14} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(student.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                      title="Eliminar estudiante"
                    >
                      <Trash2 size={14} />
                    </button>
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

      {/* Modales - Solo agrego los más importantes por espacio */}
      
      {/* Modal de acciones administrativas */}
      <AnimatePresence>
        {showAdminActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAdminActions(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {adminAction ? (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Confirmar Acción</h3>
                      <p className="text-sm text-gray-600">Esta acción modificará el estado del estudiante</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setAdminAction(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const student = students.find(s => s.id === showAdminActions);
                        if (student) {
                          if (adminAction === 'reset') {
                            handleResetMembership(student.id);
                          } else if (adminAction === 'activate') {
                            handleToggleStudentStatus(student.id, true);
                          } else if (adminAction === 'deactivate') {
                            handleToggleStudentStatus(student.id, false);
                          }
                        }
                      }}
                      disabled={isProcessingAdmin}
                      className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
                    >
                      {isProcessingAdmin ? 'Procesando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Settings className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Acciones Administrativas</h3>
                      <p className="text-sm text-gray-600">Selecciona una acción para este estudiante</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const student = students.find(s => s.id === showAdminActions);
                      if (!student) return null;
                      
                      const availableActions = getAvailableActions(student);
                      
                      return availableActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => setAdminAction(action.id as 'reset' | 'activate' | 'deactivate')}
                          className="w-full p-4 rounded-lg border-2 hover:border-opacity-50 transition-all text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{action.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900">{action.label}</div>
                              <div className="text-sm text-gray-600">{action.description}</div>
                            </div>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowAdminActions(null)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación de eliminación */}
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

      {/* ✅ Información del cache y sistema optimizado */}
      {lastUpdate > 0 && (
        <div className="text-center mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-center space-x-4 flex-wrap gap-2">
            <span>Cache válido hasta: {new Date(lastUpdate + CACHE_DURATION).toLocaleString()}</span>
            {cacheUsed && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                📱 Datos desde cache
              </span>
            )}
            <span className={`px-2 py-1 text-xs rounded-full ${
              dataScope === 'active' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {dataScope === 'active' ? '🎯 Optimizado: Solo activos' : '📊 Completo: Todos los datos'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StudentsTable;