import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = 4000;

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:5173', // URL del frontend en desarrollo
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use('/api', adminRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
