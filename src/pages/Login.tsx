import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate('/perfil');
    } catch (error) {
      alert('Login fallido. Verifica tus datos.');
      console.error(error);
    }
  };

  return (
    <div className="container">
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full" />
        </div>
        <div>
          <label>Contraseña</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required className="w-full" />
        </div>
        <button type="submit" className="btn-primary">Ingresar</button>
      </form>
    </div>
  );
}
