import { Payment } from '../../types/Payment';
import { formatDate, formatCurrency } from '../../utils/format';

interface Props {
  payments: Payment[];
  filters: { name: string; method: string; date: string };
  setFilters: (f: any) => void;
}

export default function PaymentsTable({ payments, filters, setFilters }: Props) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Pagos</h3>
      <table className="min-w-full text-sm border">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-2">Nombre</th>
            <th className="px-2">Monto</th>
            <th className="px-2">Método</th>
            <th className="px-2">Fecha</th>
          </tr>
          <tr>
            <th><input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} className="text-black px-1 w-full" /></th>
            <th></th>
            <th><input value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })} className="text-black px-1 w-full" /></th>
            <th><input value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} className="text-black px-1 w-full" /></th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-2 py-1">{p.fullName}</td>
              <td className="px-2 py-1">{formatCurrency(p.amount)}</td>
              <td className="px-2 py-1">{p.method}</td>
              <td className="px-2 py-1">{formatDate(p.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}