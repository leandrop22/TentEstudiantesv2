import { Student } from '../../types/Student';

interface Props {
  students: Student[];
  onExport: () => void;
  filters: { name: string; faculty: string };
  setFilters: (f: any) => void;
}

export default function StudentsTable({ students, onExport, filters, setFilters }: Props) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Estudiantes Registrados</h3>
      <button onClick={onExport} className="bg-yellow-500 text-white px-4 py-2 rounded mb-2">Exportar</button>
      <table className="min-w-full text-sm border">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-2">Nombre y Apellido</th>
            <th className="px-2">Facultad</th>
          </tr>
          <tr>
            <th><input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} className="text-black px-1 w-full" /></th>
            <th><input value={filters.faculty} onChange={e => setFilters({ ...filters, faculty: e.target.value })} className="text-black px-1 w-full" /></th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id} className="border-t">
              <td className="px-2 py-1">{s.fullName}</td>
              <td className="px-2 py-1">{s.faculty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
