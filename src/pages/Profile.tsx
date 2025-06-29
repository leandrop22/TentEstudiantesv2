import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  tipo: string;
  descripcion?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [estudiante, setEstudiante] = useState<any>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user) return;

      const q = query(collection(db, 'students'), where('email', '==', user.email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setEstudiante({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      }

      const planesSnap = await getDocs(query(collection(db, 'plans'), where('activo', '==', true)));
      const planesList: Plan[] = planesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Plan));
      setPlanes(planesList);
    };
    cargarDatos();
  }, [user]);

  const comprarPlan = async (plan: Plan) => {
    if (!estudiante) return;

    const inicio = new Date();
    const vencimiento = new Date();
    vencimiento.setMonth(vencimiento.getMonth() + 1);

    const membresia = {
      tipo: plan.id,
      nombre: plan.nombre,
      estado: 'activa',
      fechaInicio: inicio.toISOString(),
      fechaVencimiento: vencimiento.toISOString(),
    };

    await updateDoc(doc(db, 'students', estudiante.id), { membresia });
    setEstudiante({ ...estudiante, membresia });
    setMensaje('¡Plan activado correctamente!');
  };

  return (
    <div className="container">
      <h2>Mi Perfil</h2>
      {estudiante && (
        <div className="space-y-2">
          <p><strong>Nombre:</strong> {estudiante.fullName}</p>
          <p><strong>Email:</strong> {estudiante.email}</p>
          <p><strong>Código de acceso:</strong> {estudiante.accessCode}</p>

          {estudiante.membresia ? (
            <div className="bg-green-100 p-3 rounded">
              <p><strong>Plan:</strong> {estudiante.membresia.nombre}</p>
              <p><strong>Válido hasta:</strong> {new Date(estudiante.membresia.fechaVencimiento).toLocaleDateString()}</p>
              <p><strong>Estado:</strong> {estudiante.membresia.estado}</p>
            </div>
          ) : (
            <div className="bg-yellow-100 p-3 rounded">
              <p>No tenés una membresía activa.</p>
            </div>
          )}
        </div>
      )}

      <hr className="my-4" />

      <h3>Planes disponibles</h3>
      <div className="space-y-3">
        {planes.map((plan) => (
          <div key={plan.id} className="border rounded p-3">
            <p><strong>{plan.nombre}</strong> — ${plan.precio}</p>
            <p className="text-sm text-gray-600">{plan.descripcion}</p>
            <button className="btn-primary mt-2" onClick={() => comprarPlan(plan)}>Adquirir</button>
          </div>
        ))}
      </div>

      {mensaje && <div className="mt-4 text-green-700">{mensaje}</div>}
    </div>
  );
}
