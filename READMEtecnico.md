# 🏢 TentCowork - Sistema de Membresías

Sistema de gestión para espacios de coworking que permite a los estudiantes acceder al espacio mediante códigos de acceso, gestionar sus membresías y realizar pagos.
Sistema de gestión para espacios de coworking que permite a los estudiantes acceder al espacio mediante códigos de acceso, gestionar sus membresías y realizar pagos en recepción o por mercado pago hospedado.

## 📋 Descripción

**TentCowork** es una aplicación completa que incluye:

- 🖥️ **Tablet de Check-in/Check-out**: Para que estudiantes ingresen y salgan del coworking
- 📱 **App Web para Estudiantes**: Gestión de perfil, planes y pagos
- 👨‍💼 **Panel de Administración**: Dashboard completo con métricas y gestión
- 💳 **Integración con Mercado Pago**: Pagos seguros y automatizados
- 📊 **Sistema de métricas**: Control de asistencia y pagos

## 🏗️ Arquitectura

### Frontend (React + TypeScript + Vite)
- **Ubicación**: `tentcowork-frontend/`
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite
- **Hosting**: Firebase Hosting
- **Estilos**: Tailwind CSS + Framer Motion

### Backend (Node.js + Express + Firebase)
- **Ubicación**: `tentcowork-backend/`
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Hosting**: Firebase Cloud Functions
- **Base de datos**: Firestore
- **Autenticación**: Firebase Auth

## 🚀 Despliegue Rápido

### URLs de Producción
- **Frontend**: https://tentcowork-estudiantes-v2.web.app/
- **Backend**: https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/backend

## 💻 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+
- Firebase CLI
- Git

### 1. Clonar el repositorio
```bash
git clone [URL_DEL_REPO]
cd tent-estudiantes-v2
```

### 2. Configurar Firebase
```bash
firebase login
firebase use tentcowork-estudiantes-v2
```

### 3. Backend - Configuración
```bash
cd tentcowork-backend/functions
npm install

# Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase y Mercado Pago
```

### 4. Frontend - Configuración
```bash
cd ../../tentcowork-frontend
npm install

# Crear archivo de variables de entorno
echo "VITE_BACKEND_URL=https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/backend" > .env
```

### 5. Desarrollo Local

**Backend (Cloud Functions Emulator):**
```bash
cd tentcowork-backend
firebase emulators:start --only functions
```

**Frontend (Dev Server):**
```bash
cd tentcowork-frontend
npm run dev
```

## 🌐 Despliegue a Producción

### Deploy Completo
```bash
# Build del frontend
cd tentcowork-frontend
npm run build

# Deploy completo
cd ..
firebase deploy
```

### Deploy Específico
```bash
# Solo Backend
firebase deploy --only functions

# Solo Frontend
firebase deploy --only hosting
```

## ⚙️ Configuración

### Variables de Entorno

**Backend** (`tentcowork-backend/.env`):
```env
FIREBASE_PROJECT_ID=tentcowork-estudiantes-v2
MP_ACCESS_TOKEN=tu_access_token_de_mercado_pago
MP_PUBLIC_KEY=tu_public_key_de_mercado_pago
```

**Frontend** (`tentcowork-frontend/.env`):
```env
VITE_BACKEND_URL=https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/backend
VITE_MP_PUBLIC_KEY=tu_public_key_de_mercado_pago
```

### Firebase Configuration
Asegúrate de tener configurado en `firebase.json`:
```json
{
  "functions": {
    "source": "tentcowork-backend/functions"
  },
  "hosting": {
    "public": "tentcowork-frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 📊 Funcionalidades Principales

### Para Estudiantes
- ✅ Check-in/Check-out con código de acceso
- ✅ Gestión de perfil personal
- ✅ Visualización de planes disponibles
- ✅ Contratación y pago de membresías
- ✅ Historial de sesiones y pagos

### Para Administradores
- ✅ Dashboard con métricas en tiempo real
- ✅ Gestión de estudiantes (30-40 por día)
- ✅ Control de pagos y membresías
- ✅ Estadísticas de uso del coworking
- ✅ Gestión de planes y precios

### Sistema de Pagos
- ✅ Integración completa con Mercado Pago
- ✅ Múltiples métodos de pago
- ✅ Webhooks para confirmación automática
- ✅ Estados de pago en tiempo real

## 📈 Métricas del Sistema

### Capacidad Actual
- **Estudiantes por día**: 30-40
- **Horario de operación**: 8:00 - 21:30
- **Sesiones diarias**: ~60-80 check-ins/check-outs
- **Costo de infraestructura**: ~$0-5/mes (tier gratuito)

### Performance
- **Cold start**: ~1-2 segundos (primera consulta del día)
- **Consultas normales**: <500ms
- **Instancias activas**: 1-2 durante horario laboral

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Framework principal
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **Framer Motion** - Animaciones
- **React Router** - Navegación
- **Lucide React** - Iconos

### Backend
- **Node.js 18** - Runtime
- **Express.js** - Framework web
- **Firebase Functions** - Serverless hosting
- **Firestore** - Base de datos NoSQL
- **Firebase Auth** - Autenticación
- **Mercado Pago SDK** - Procesamiento de pagos
- **CORS** - Cross-origin requests

### DevOps & Deployment
- **Firebase Hosting** - Frontend deployment
- **Firebase Functions** - Backend deployment
- **GitHub** - Control de versiones
- **Firebase Console** - Monitoreo y administración

## 🔧 Scripts Útiles

```bash
# Verificar estado de Cloud Functions
firebase functions:list

# Ver logs en tiempo real
firebase functions:log

# Verificar configuración del proyecto
firebase use

# Limpiar builds
cd tentcowork-frontend && rm -rf dist/
cd tentcowork-backend/functions && rm -rf dist/

# Verificar URLs del backend
curl https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/backend
```

## 🐛 Solución de Problemas Comunes

### Frontend no carga (pantalla en blanco)
1. Verificar que `VITE_BACKEND_URL` esté configurada
2. Revisar la consola del navegador (F12)
3. Verificar que el build se haya generado correctamente

### Error 404 en API calls
1. Verificar que las rutas del backend sean relativas (no URLs completas)
2. Confirmar que el backend esté desplegado
3. Probar las URLs manualmente con curl

### Variables de entorno no funcionan
1. Verificar que los archivos `.env` estén en las carpetas correctas
2. Reiniciar el servidor de desarrollo
3. Hacer rebuild del proyecto

## 📞 Contacto y Soporte

- **Desarrollador**: Leandro
- **Proyecto**: TentCowork Sistema de Membresías
- **Última actualización**: Julio 2025

---

## 📄 Licencia

Este proyecto es de uso privado para TentCowork.

---

*Sistema desarrollado para optimizar la gestión de espacios de coworking y mejorar la experiencia de estudiantes y administradores.*
