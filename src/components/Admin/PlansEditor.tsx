import { Plan } from '../../types/Plan';

interface Props {
  plans: Plan[];
  formData: Plan;
  setFormData: (f: Plan) => void;
  editingId: string | null;
  onSubmit: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: Plan) => void;
}

export default function PlansEditor({ plans, formData, setFormData, editingId, onSubmit, onDelete, onEdit }: Props) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Planes</h3>
      <div className="flex flex-wrap gap-2 my-2">
        <input placeholder="Nombre" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="border px-2" />
        <input placeholder="Precio" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="border px-2" />
        <input placeholder="Días" value={formData.days} onChange={e => setFormData({ ...formData, days: e.target.value })} className="border px-2" />
        <input placeholder="Hora inicio" value={formData.startHour} onChange={e => setFormData({ ...formData, startHour: e.target.value })} className="border px-2" />
        <input placeholder="Hora fin" value={formData.endHour} onChange={e => setFormData({ ...formData, endHour: e.target.value })} className="border px-2" />
        <input placeholder="Descripción" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="border px-2 w-60" />
        <button onClick={onSubmit} className="bg-green-600 text-white px-2">{editingId ? 'Editar' : 'Agregar'}</button>
      </div>
      <ul>
        {plans.map(p => (
          <li key={p.id} className="border-b py-1 flex justify-between">
            <span>{p.name} - ${p.price}</span>
            <span className="space-x-2">
              <button onClick={() => onEdit(p.id, p)}>✏️</button>
              <button onClick={() => onDelete(p.id)}>🗑️</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
