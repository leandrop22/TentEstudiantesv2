import { Session } from '../../types/Session';
import { formatDateTime, formatDuration } from '../../utils/format';

interface Props {
  sessions: Session[];
  onExport: () => void;
  filters: { name: string; in: string; out: string };
  setFilters: (f: any) => void;
}

export default function SessionsTable({ sessions, onExport, filters, setFilters }: Props) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Sesiones de Check-in/Out</h3>
      <button onClick={onExport} className="bg-yellow-500 text-white px-4 py-2 rounded mb-2">Exportar</button>
      <table className="min-w-full text-sm border">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-2">Nombre</th>
            <th className="px-2">Entrada</th>
            <th className="px-2">Salida</th>
            <th className="px-2">Tiempo Total</th>
          </tr>
          <tr>
            <th><input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} className="text-black px-1 w-full" /></th>
            <th><input value={filters.in} onChange={e => setFilters({ ...filters, in: e.target.value })} className="text-black px-1 w-full" /></th>
            <th><input value={filters.out} onChange={e => setFilters({ ...filters, out: e.target.value })} className="text-black px-1 w-full" /></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} className="border-t">
              <td className="px-2 py-1">{s.fullName}</td>
              <td className="px-2 py-1">{formatDateTime(s.checkInTimestamp)}</td>
              <td className="px-2 py-1">{s.checkOutTimestamp ? formatDateTime(s.checkOutTimestamp) : 'En curso'}</td>
              <td className="px-2 py-1">{formatDuration(s.durationMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
