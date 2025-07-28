import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '../../utils/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  Activity, 
  Search, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Session {
  id: string;
  fullName: string;
  checkInTimestamp: Timestamp;
  checkOutTimestamp: Timestamp | null;
  durationMinutes: number | null;
  isToday?: boolean;
  isActive?: boolean; // Sesión sin checkout
}

type SortField = 'fullName' | 'checkInTimestamp' | 'checkOutTimestamp' | 'durationMinutes';
type SortOrder = 'asc' | 'desc';

// ✅ CACHE CONFIG
const CACHE_KEY = 'sessionsTableCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos (más frecuente para datos en tiempo real)

interface CacheData {
  sessions: Session[];
  lastUpdate: number;
  cacheExpiry: number;
}

const SessionsTable: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheUsed, setCacheUsed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [autoClosing, setAutoClosing] = useState(false);
  
  // ✅ Filtros con sesiones del día por defecto
  const [filters, setFilters] = useState({
    name: '',
    dateFilter: 'today', // ✅ Filtro predeterminado de hoy
    showActiveOnly: false,
  });
  
  const [showFilters, setShowFilters] = useState(true);
  // ✅ CORREGIDO: Permitir null en los tipos de estado
  const [sortField, setSortField] = useState<SortField | null>('checkInTimestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder | null>('desc'); // Más recientes primero
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ✅ Cache del navegador - Cargar datos
  const loadFromCache = (): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        console.log('🔍 Verificando cache de sesiones:', {
          'Cache timestamp': new Date(data.lastUpdate).toLocaleString(),
          'Current time': new Date(now).toLocaleString(),
          'Cache valid': now < data.cacheExpiry
        });
        
        if (now < data.cacheExpiry) {
          /* console.log('✅ Usando sesiones desde cache'); */

          setCacheUsed(true);
          return data;
        } else {
          /* console.log('⏰ Cache de sesiones expirado'); */

          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('❌ Error leyendo cache de sesiones:', error);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  // ✅ Cache del navegador - Guardar datos
  const saveToCache = (sessionsData: Session[]) => {
    try {
      const now = Date.now();
      const dataToCache: CacheData = {
        sessions: sessionsData,
        lastUpdate: now,
        cacheExpiry: now + CACHE_DURATION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
      /* console.log('💾 Sesiones guardadas en cache hasta:', new Date(dataToCache.cacheExpiry).toLocaleString()); */

      setLastUpdate(now);
    } catch (error) {
      console.error('❌ Error guardando cache de sesiones:', error);
    }
  };

  // ✅ FUNCIÓN PARA CERRAR SESIONES AUTOMÁTICAMENTE A LAS 21:30
  const autoCloseSessions = async () => {
    try {
      setAutoClosing(true);
      /* console.log('🔄 Iniciando cierre automático de sesiones...'); */

      
      // Obtener sesiones activas (sin checkout)
      const activeSessions = sessions.filter(session => !session.checkOutTimestamp);
      
      if (activeSessions.length === 0) {
        /* console.log('ℹ️ No hay sesiones activas para cerrar'); */

        return;
      }

      const now = new Date();
      const closeTime = new Date();
      closeTime.setHours(21, 30, 0, 0); // 21:30:00
      
      /* console.log(`🕘 Cerrando ${activeSessions.length} sesiones a las 21:30`); */

      
      const updatePromises = activeSessions.map(async (session) => {
        const checkInTime = session.checkInTimestamp.toDate();
        const durationMs = closeTime.getTime() - checkInTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        // Actualizar sesión en Firestore
        const sessionRef = doc(db, 'sessions', session.id);
        await updateDoc(sessionRef, {
          checkOutTimestamp: Timestamp.fromDate(closeTime),
          durationMinutes: durationMinutes > 0 ? durationMinutes : 0
        });
        
        /* console.log(`✅ Sesión cerrada: ${session.fullName} - Duración: ${durationMinutes} min`); */

        
        return {
          ...session,
          checkOutTimestamp: Timestamp.fromDate(closeTime),
          durationMinutes: durationMinutes > 0 ? durationMinutes : 0,
          isActive: false
        };
      });
      
      const updatedSessions = await Promise.all(updatePromises);
      
      // Actualizar estado local
      setSessions(prevSessions => 
        prevSessions.map(session => {
          const updated = updatedSessions.find(u => u.id === session.id);
          return updated || session;
        })
      );
      
      // Limpiar cache para forzar actualización
      localStorage.removeItem(CACHE_KEY);
      
      alert(`✅ Se cerraron automáticamente ${activeSessions.length} sesiones a las 21:30`);
      
    } catch (error) {
      console.error('❌ Error cerrando sesiones automáticamente:', error);
      alert('Error al cerrar sesiones automáticamente');
    } finally {
      setAutoClosing(false);
    }
  };

  // ✅ Verificar si es hora de cerrar sesiones automáticamente
  const checkAutoCloseTime = useCallback(() => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // 2130 para 21:30
    
    // Si son las 21:30 y hay sesiones activas
    if (currentTime === 2130) {
      const activeSessions = sessions.filter(s => !s.checkOutTimestamp);
      if (activeSessions.length > 0) {
        /* console.log('🕘 Es hora de cerrar sesiones automáticamente'); */

        autoCloseSessions();
      }
    }
  }, [sessions]);

  // ✅ Fetch optimizado con filtros
  const fetchSessions = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setCacheUsed(false);
      
      /* console.log('🔄 Iniciando fetch de sesiones...'); */

      
      const now = new Date();
      let sessionsQuery;
      
      if (filters.dateFilter === 'today') {
        // ✅ Solo sesiones de hoy por defecto
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('checkInTimestamp', '>=', Timestamp.fromDate(startOfDay)),
          orderBy('checkInTimestamp', 'desc'),
          limit(100) // Límite para sesiones del día
        );
      } else if (filters.dateFilter === 'week') {
        // Sesiones de la semana
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);
        
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('checkInTimestamp', '>=', Timestamp.fromDate(startOfWeek)),
          orderBy('checkInTimestamp', 'desc'),
          limit(200)
        );
      } else {
        // Todas las sesiones (últimos 30 días)
        const startOfMonth = new Date();
        startOfMonth.setDate(startOfMonth.getDate() - 30);
        
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('checkInTimestamp', '>=', Timestamp.fromDate(startOfMonth)),
          orderBy('checkInTimestamp', 'desc'),
          limit(300)
        );
      }
      
      const querySnapshot = await getDocs(sessionsQuery);
      
      const sessionsData: Session[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const checkInDate = data.checkInTimestamp ? data.checkInTimestamp.toDate() : new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return {
          id: doc.id,
          fullName: data.fullName || '',
          checkInTimestamp: data.checkInTimestamp || Timestamp.now(),
          checkOutTimestamp: data.checkOutTimestamp || null,
          durationMinutes: data.durationMinutes || null,
          isToday: checkInDate >= today,
          isActive: !data.checkOutTimestamp
        };
      });
      
      console.log('✅ Sesiones obtenidas:', {
        'Total sesiones': sessionsData.length,
        'Sesiones de hoy': sessionsData.filter(s => s.isToday).length,
        'Sesiones activas': sessionsData.filter(s => s.isActive).length,
        'Filtro aplicado': filters.dateFilter
      });
      
      setSessions(sessionsData);
      
      // ✅ Guardar en cache
      saveToCache(sessionsData);

    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verificar tiempo de cierre automático cada minuto
  useEffect(() => {
    const interval = setInterval(checkAutoCloseTime, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, [checkAutoCloseTime]);

  useEffect(() => {
    // Intentar cargar desde cache primero
    const cachedData = loadFromCache();
    if (cachedData) {
      setSessions(cachedData.sessions);
      setLastUpdate(cachedData.lastUpdate);
      setLoading(false);
      return;
    }
    
    // Si no hay cache válido, hacer fetch
    fetchSessions();
  }, []);

  // ✅ Refetch cuando cambia el filtro de fecha
  useEffect(() => {
    if (!loading && filters.dateFilter !== 'today') {
      fetchSessions();
    }
  }, [filters.dateFilter]);

  const handleForceRefresh = () => {
    /* console.log('🔄 Forzando actualización de sesiones...'); */

    localStorage.removeItem(CACHE_KEY);
    fetchSessions(true);
  };

  // ✅ CORREGIDO: Función handleSort con tipos null permitidos
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // ✅ Filtrado optimizado
  const getSortedAndFilteredSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
      // Filtro por nombre (solo cuando hay búsqueda)
      const matchesName = !filters.name || 
        session.fullName.toLowerCase().includes(filters.name.toLowerCase());
      
      // Filtro por sesiones activas
      const matchesActive = !filters.showActiveOnly || session.isActive;
      
      return matchesName && matchesActive;
    });

    // Ordenamiento
    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (sortField === 'checkInTimestamp' || sortField === 'checkOutTimestamp') {
          aValue = aValue ? aValue.toDate().getTime() : 0;
          bValue = bValue ? bValue.toDate().getTime() : 0;
        } else if (sortField === 'fullName') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        } else if (sortField === 'durationMinutes') {
          aValue = aValue || 0;
          bValue = bValue || 0;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [sessions, filters, sortField, sortOrder]);

  // ✅ CORREGIDO: Función getSortIcon con manejo de null
  const getSortIcon = (field: SortField) => {
    if (sortField !== field || sortField === null) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#F29F05]" />;
    } else if (sortOrder === 'desc') {
      return <ArrowDown className="h-4 w-4 text-[#F29F05]" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  const filteredSessions = getSortedAndFilteredSessions;
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSessions = filteredSessions.slice(startIndex, endIndex);

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '00h 00m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  const exportData = () => {
    if (filteredSessions.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const exportData = filteredSessions.map(session => ({
      'Nombre y Apellido': session.fullName,
      'Fecha de Entrada': formatDate(session.checkInTimestamp),
      'Fecha de Salida': session.checkOutTimestamp ? formatDate(session.checkOutTimestamp) : 'En curso',
      'Estado': session.isActive ? 'Activa' : 'Completada',
      'Es de Hoy': session.isToday ? 'Sí' : 'No',
      'Tiempo Total': formatDuration(session.durationMinutes),
      'Duración (minutos)': session.durationMinutes || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sesiones');

    const colWidths = [
      { wch: 25 }, // Nombre y Apellido
      { wch: 20 }, // Fecha de Entrada
      { wch: 20 }, // Fecha de Salida
      { wch: 12 }, // Estado
      { wch: 10 }, // Es de Hoy
      { wch: 15 }, // Tiempo Total
      { wch: 18 }  // Duración (minutos)
    ];
    ws['!cols'] = colWidths;

    const fileName = `sesiones_${filters.dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Stats calculadas
  const stats = useMemo(() => {
    const todaySessions = sessions.filter(s => s.isToday);
    const activeSessions = sessions.filter(s => s.isActive);
    const completedToday = todaySessions.filter(s => !s.isActive);
    
    return {
      total: filteredSessions.length,
      today: todaySessions.length,
      active: activeSessions.length,
      completed: completedToday.length
    };
  }, [sessions, filteredSessions]);

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#F29F05] border-dashed rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">
            {cacheUsed ? 'Cargando sesiones desde cache...' : 'Cargando sesiones optimizadas...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-0"
    >
      {/* Header Principal */}
      <div className="bg-gradient-to-r from-[#F29F05] to-tent-orange rounded-t-xl shadow-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sesiones de Check-in/Out</h1>
              <p className="text-orange-100 mt-1 flex items-center space-x-2">
                <span>
                  {filters.dateFilter === 'today' ? 'Mostrando sesiones de hoy' : 
                   filters.dateFilter === 'week' ? 'Mostrando sesiones de la semana' : 
                   'Registro de entradas y salidas'}
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
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportData}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-3 rounded-lg flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span className="font-medium">Exportar</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={autoCloseSessions}
              disabled={autoClosing || sessions.filter(s => s.isActive).length === 0}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-3 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Clock className="h-5 w-5" />
              <span className="font-medium">
                {autoClosing ? 'Cerrando...' : 'Cerrar Sesiones (21:30)'}
              </span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleForceRefresh}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-3 rounded-lg flex items-center space-x-2"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="font-medium">Actualizar</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-3 rounded-lg flex items-center space-x-2"
            >
              {showFilters ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              <span className="font-medium">
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </span>
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.total}</div>
            <div className="text-white/80 text-sm">Total Filtradas</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.today}</div>
            <div className="text-white/80 text-sm">Sesiones Hoy</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.active}</div>
            <div className="text-white/80 text-sm">Activas</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.completed}</div>
            <div className="text-white/80 text-sm">Completadas Hoy</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-orange-50 border border-gray-200 rounded-lg p-6 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Buscador por nombre */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F29F05] focus:border-transparent"
                />
              </div>

              {/* Filtro de fecha */}
              <select
                value={filters.dateFilter}
                onChange={(e) => setFilters({ ...filters, dateFilter: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F29F05] focus:border-transparent"
              >
                <option value="today">📅 Solo Hoy (por defecto)</option>
                <option value="week">📊 Última Semana</option>
                <option value="all">🗂️ Últimos 30 días</option>
              </select>

              {/* Toggle sesiones activas */}
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showActiveOnly}
                    onChange={(e) => setFilters({ ...filters, showActiveOnly: e.target.checked })}
                    className="w-4 h-4 text-[#F29F05] bg-gray-100 border-gray-300 rounded focus:ring-[#F29F05] focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <UserCheck size={16} />
                    <span>Solo sesiones activas</span>
                  </span>
                </label>
              </div>

              {/* Botón de ordenamiento */}
              <button
                onClick={() => handleSort('fullName')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  sortField === 'fullName'
                    ? 'bg-[#F29F05] text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-[#F29F05] hover:text-white border border-gray-300'
                }`}
              >
                {getSortIcon('fullName')}
                <span>A-Z</span>
              </button>
            </div>

            {/* Indicador de filtros */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-lg border">
                {filters.dateFilter === 'today' 
                  ? `📅 Mostrando ${filteredSessions.length} sesiones de hoy`
                  : filters.dateFilter === 'week'
                  ? `📊 Mostrando ${filteredSessions.length} sesiones de la semana`
                  : `🗂️ Mostrando ${filteredSessions.length} sesiones de los últimos 30 días`
                }
                {filters.showActiveOnly && ` (solo activas)`}
              </div>
              
              {/* Información de cierre automático */}
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg flex items-center space-x-2">
                <Clock size={16} className="text-yellow-600" />
                <span>Cierre automático: 21:30</span>
                {sessions.filter(s => s.isActive).length > 0 && (
                  <span className="text-red-600 font-medium">
                    ({sessions.filter(s => s.isActive).length} activas)
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-[#014023] to-tent-green">
              <tr>
                <th 
                  onClick={() => handleSort('fullName')}
                  className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#014023]/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Nombre y Apellido</span>
                    {getSortIcon('fullName')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Estado</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('checkInTimestamp')}
                  className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#014023]/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Entrada</span>
                    {getSortIcon('checkInTimestamp')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('checkOutTimestamp')}
                  className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#014023]/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Salida</span>
                    {getSortIcon('checkOutTimestamp')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('durationMinutes')}
                  className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#014023]/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Tiempo Total</span>
                    {getSortIcon('durationMinutes')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentSessions.map((session, index) => (
                <motion.tr 
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gradient-to-r hover:from-[#F29F05]/10 hover:to-[#014023]/10 transition-all duration-200 ${
                    session.isActive ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900">{session.fullName}</div>
                      {session.isToday && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Calendar size={10} className="mr-1" />
                          Hoy
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <CheckCircle size={12} className="mr-1" />
                        Completada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatDate(session.checkInTimestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {session.checkOutTimestamp ? formatDate(session.checkOutTimestamp) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock size={12} className="mr-1" />
                          En curso
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium flex items-center space-x-2 ${
                      session.durationMinutes ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      <span>{formatDuration(session.durationMinutes)}</span>
                      {session.isActive && (
                        <span className="text-xs text-green-600">(en curso)</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSessions.length)} de {filteredSessions.length} entradas
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors ${
                  currentPage === 1 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-300'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </motion.button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-[#F29F05] to-orange-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-[#F29F05]/10 hover:text-[#F29F05] border border-gray-300'
                    }`}
                  >
                    {page}
                  </motion.button>
                ))}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors ${
                  currentPage === totalPages 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-300'
                }`}
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Info - Información del cache */}
      {lastUpdate > 0 && (
        <div className="text-center mt-4 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
          <div className="flex items-center justify-center space-x-4">
            <span>Cache válido hasta: {new Date(lastUpdate + CACHE_DURATION).toLocaleString()}</span>
            {cacheUsed && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                📱 Datos desde cache
              </span>
            )}
            {sessions.filter(s => s.isActive).length > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                ⏰ {sessions.filter(s => s.isActive).length} sesiones para auto-cierre a las 21:30
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alert sobre el cierre automático */}
      {sessions.filter(s => s.isActive).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-yellow-600" size={20} />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Cierre Automático Programado
              </h4>
              <p className="text-sm text-yellow-700">
                Las sesiones activas se cerrarán automáticamente a las 21:30. 
                También puedes usar el botón "Cerrar Sesiones" para forzar el cierre ahora.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SessionsTable;