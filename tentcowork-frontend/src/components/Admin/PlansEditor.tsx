import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Edit2, Trash2, Clock, DollarSign, ChevronDown, ChevronUp, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { Plan } from '../../types/Plan';

interface Props {
  plans: Plan[];
  formData: Plan;
  setFormData: (f: Plan) => void;
  editingId: string | null;
  onSubmit: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: Plan) => void;
  onCheckStudentsUsingPlan?: (planId: string) => Promise<number>; // Nueva prop para verificar estudiantes
}

const PlansEditor: React.FC<Props> = ({ 
  plans, 
  formData, 
  setFormData, 
  editingId, 
  onSubmit, 
  onDelete, 
  onEdit,
  onCheckStudentsUsingPlan
}) => {
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    planId: string;
    planName: string;
    studentsCount: number;
  }>({ show: false, planId: '', planName: '', studentsCount: 0 });

  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const handleEdit = (id: string, data: Plan) => {
    onEdit(id, data);
    setShowForm(true); // Abrir automáticamente el formulario
  };

  const handleDeleteClick = async (planId: string, planName: string) => {
    let studentsCount = 0;
    
    if (onCheckStudentsUsingPlan) {
      try {
        studentsCount = await onCheckStudentsUsingPlan(planId);
      } catch (error) {
        console.error('Error verificando estudiantes:', error);
      }
    }

    setDeleteConfirmation({
      show: true,
      planId,
      planName,
      studentsCount
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.studentsCount === 0) {
      onDelete(deleteConfirmation.planId);
    }
    setDeleteConfirmation({ show: false, planId: '', planName: '', studentsCount: 0 });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, planId: '', planName: '', studentsCount: 0 });
  };

  const formatDays = (days: string) => {
    if (!days) return '';
    const dayMap: { [key: string]: string } = {
      'Lunes': 'L', 'Martes': 'M', 'Miércoles': 'X', 'Jueves': 'J', 
      'Viernes': 'V', 'Sábado': 'S', 'Domingo': 'D'
    };
    return days.split(',').map(day => dayMap[day.trim()] || day.trim()).join('');
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-tent-orange to-tent-orange p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Planes</h2>
              <p className="text-orange-100 text-sm">Gestión de planes de entrenamiento</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 flex items-center space-x-2"
          >
            {showForm ? <EyeOff size={20} /> : <Eye size={20} />}
            <span>{showForm ? 'Ocultar' : 'Mostrar'} Formulario</span>
          </motion.button>
        </div>
      </div>

      {/* Formulario Colapsible */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-orange-50 border-b border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-1 h-6 bg-green-500 rounded-full mr-3"></div>
                {editingId ? 'Editar Plan' : 'Agregar Nuevo Plan'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nombre del plan"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-tent-orange focus:border-transparent bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={20} />
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-tent-orange focus:border-transparent bg-white/80 backdrop-blur-sm"
                  />
                  <span className="absolute right-3 top-3.5 text-gray-400 text-sm font-medium">
                    ARS
                  </span>
                </div>

                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                  <input
                    type="time"
                    value={formData.startHour}
                    onChange={e => setFormData({ ...formData, startHour: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                  />
                </div>

                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                  <input
                    type="time"
                    value={formData.endHour}
                    onChange={e => setFormData({ ...formData, endHour: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-tent-orange focus:border-transparent bg-white/80 backdrop-blur-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de la semana
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { key: 'Lunes', label: 'L' },
                      { key: 'Martes', label: 'M' },
                      { key: 'Miércoles', label: 'X' },
                      { key: 'Jueves', label: 'J' },
                      { key: 'Viernes', label: 'V' },
                      { key: 'Sábado', label: 'S' },
                      { key: 'Domingo', label: 'D' }
                    ].map(day => {
                      const selectedDays = formData.days?.split(',').map(d => d.trim()) || [];
                      const isSelected = selectedDays.includes(day.key);
                      return (
                        <label key={day.key} className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const updatedDays = e.target.checked
                                ? [...selectedDays, day.key]
                                : selectedDays.filter(d => d !== day.key);
                              setFormData({ ...formData, days: updatedDays.join(', ') });
                            }}
                            className="sr-only"
                          />
                          <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'bg-white border-gray-300 text-gray-600 hover:border-green-300'
                          }`}>
                            {day.label}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <textarea
                  placeholder="Descripción del plan..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-tent-orange focus:border-transparent resize-none bg-white/80 backdrop-blur-sm"
                />
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSubmit}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-tent-green to-tent-green text-white rounded-xl font-medium hover:from-green-600 hover:to-tent-green transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus size={20} />
                  <span>{editingId ? 'Actualizar Plan' : 'Agregar Plan'}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Planes - Diseño de Tarjetas */}
      <div className="p-6">
        {plans.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <p className="text-lg font-medium">No hay planes disponibles</p>
            <p className="text-sm">Agrega tu primer plan para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Planes Disponibles ({plans.length})
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map(plan => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 transition-all duration-200 hover:shadow-md overflow-hidden"
                >
                  {/* Header de la tarjeta */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg truncate">
                          {plan.name}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-2xl font-bold text-green-600">
                            ${plan.price}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            formatDays(plan.days) === 'Ninguno' 
                              ? 'text-gray-400 bg-gray-100' 
                              : 'text-gray-500 bg-gray-100'
                          }`}>
                            {formatDays(plan.days)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEdit(plan.id, plan)}
                          className="text-tent-orange hover:text-tent-orange p-2 rounded-lg hover:bg-orange-50 transition-colors"
                          title="Editar plan"
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteClick(plan.id, plan.name)}
                          className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar plan"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Contenido de la tarjeta */}
                  <div className="p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {plan.startHour} - {plan.endHour}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {expandedPlans.has(plan.id) ? (
                        <p>{plan.description}</p>
                      ) : (
                        <p>{truncateText(plan.description, 80)}</p>
                      )}
                      
                      {plan.description && plan.description.length > 80 && (
                        <button
                          onClick={() => togglePlanExpansion(plan.id)}
                          className="text-orange-500 hover:text-orange-600 text-xs font-medium mt-2 flex items-center"
                        >
                          {expandedPlans.has(plan.id) ? (
                            <>
                              <ChevronUp size={14} className="mr-1" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} className="mr-1" />
                              Ver más
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Borrado */}
      <AnimatePresence>
        {deleteConfirmation.show && (
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
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    deleteConfirmation.studentsCount > 0 ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    {deleteConfirmation.studentsCount > 0 ? (
                      <X className="text-red-600" size={24} />
                    ) : (
                      <AlertTriangle className="text-orange-600" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {deleteConfirmation.studentsCount > 0 ? 'No se puede eliminar' : 'Confirmar eliminación'}
                    </h3>
                    <p className="text-sm text-gray-500">Plan: {deleteConfirmation.planName}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                {deleteConfirmation.studentsCount > 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      <strong>No se puede eliminar este plan.</strong>
                    </p>
                    <p className="text-red-700 text-sm mt-2">
                      Hay <strong>{deleteConfirmation.studentsCount} estudiante{deleteConfirmation.studentsCount !== 1 ? 's' : ''}</strong> {' '}
                      asignado{deleteConfirmation.studentsCount !== 1 ? 's' : ''} a este plan. 
                      Primero debes reasignar o eliminar estos estudiantes.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 text-sm">
                      ¿Estás seguro de que quieres eliminar el plan <strong>"{deleteConfirmation.planName}"</strong>?
                    </p>
                    <p className="text-orange-700 text-sm mt-2">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelDelete}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  {deleteConfirmation.studentsCount > 0 ? 'Entendido' : 'Cancelar'}
                </motion.button>
                {deleteConfirmation.studentsCount === 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Eliminar Plan
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlansEditor;