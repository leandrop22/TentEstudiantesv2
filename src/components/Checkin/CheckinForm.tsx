import React, { useState } from 'react';
import CodeInput from './CodeInput';
import { checkInOrOut, checkStudentStatus } from '../../services/checkinService';

const CheckinForm: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (code.length < 5) return;
    setLoading(true);
    try {
      const result = await checkInOrOut(code);
      setMessage(result);
      setCode('');
    } catch (error) {
      setMessage('Error al registrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async () => {
    if (code.length < 5) return;
    setLoading(true);
    try {
      const result = await checkStudentStatus(code);
      setMessage(result);
    } catch (error) {
      setMessage('No se pudo obtener el estado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-semibold">Ingresá tu Código</h2>
      <CodeInput value={code} onChange={setCode} />
      <div className="flex flex-col gap-2">
        <button
          onClick={handleCheck}
          disabled={loading || code.length < 5}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-md"
        >
          Registrar Entrada / Salida
        </button>
        <button
          onClick={handleStatus}
          disabled={loading || code.length < 5}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md"
        >
          Consultar Estado
        </button>
      </div>
      {message && <p className="text-center text-sm text-blue-700 mt-2">{message}</p>}
    </div>
  );
};

export default CheckinForm;
