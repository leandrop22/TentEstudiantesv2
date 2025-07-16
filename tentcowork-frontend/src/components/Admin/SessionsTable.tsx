import React, { useEffect, useState } from 'react';
import { db } from '../../utils/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
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
  EyeOff
} from 'lucide-react';

interface Session {
  id: string;
  fullName: string;
  checkInTimestamp: Timestamp;
  checkOutTimestamp: Timestamp | null;
  durationMinutes: number | null;
}

type SortField = 'fullName' | 'checkInTimestamp' | 'checkOutTimestamp' | 'durationMinutes';
type SortOrder = 'asc' | 'desc' | null;

const SessionsTable: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filters, setFilters] = useState({
    name: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchSessions = async () => {
      const querySnapshot = await getDocs(collection(db, 'sessions'));
      const sessionsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data.fullName || '',
          checkInTimestamp: data.checkInTimestamp || Timestamp.now(),
          checkOutTimestamp: data.checkOutTimestamp || null,
          durationMinutes: data.durationMinutes || null,
        };
      });
      setSessions(sessionsData);
    };
    fetchSessions();
  }, []);

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

  const getSortedAndFilteredSessions = () => {
    let filtered = sessions.filter(session => {
      return session.fullName.toLowerCase().includes(filters.name.toLowerCase());
    });

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
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#F29F05]" />;
    } else if (sortOrder === 'desc') {
      return <ArrowDown className="h-4 w-4 text-[#F29F05]" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  const filteredSessions = getSortedAndFilteredSessions();
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
      'Tiempo Total': formatDuration(session.durationMinutes),
      'Duración (minutos)': session.durationMinutes || 0
    }));

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sesiones');

    // Configurar anchos de columna
    const colWidths = [
      { wch: 25 }, // Nombre y Apellido
      { wch: 20 }, // Fecha de Entrada
      { wch: 20 }, // Fecha de Salida
      { wch: 15 }, // Tiempo Total
      { wch: 18 }  // Duración (minutos)
    ];
    ws['!cols'] = colWidths;

    // Descargar archivo
    const fileName = `sesiones_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-0"
    >      {/* Header Principal */}
      <div className="bg-gradient-to-r from-[#F29F05] to-tent-orange rounded-t-xl shadow-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sesiones de Check-in/Out</h1>
              <p className="text-orange-100 mt-1">Registro de entradas y salidas del coworking</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nombre y apellido..."
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F29F05] focus:border-transparent"
                />
              </div>
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
                  className="hover:bg-gradient-to-r hover:from-[#F29F05]/10 hover:to-[#014023]/10 transition-all duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{session.fullName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatDate(session.checkInTimestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {session.checkOutTimestamp ? formatDate(session.checkOutTimestamp) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                          En curso
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${session.durationMinutes ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formatDuration(session.durationMinutes)}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      currentPage === page
                        ? '                        bg-gradient-to-r from-[#F29F05] to-orange-600 text-white shadow-lg'
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
    </motion.div>
  );
};

export default SessionsTable;