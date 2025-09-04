🏢 TentCowork - Sistema de Membresías

Sistema de gestión para espacios de coworking que permite a los estudiantes acceder al espacio mediante códigos de acceso, gestionar sus membresías y realizar pagos en recepción o por Mercado Pago.

Desarrollador: Leandro Petricca
Estado: En producción (cliente activo: TentCowork)

📋 Descripción

TentCowork es una aplicación completa que incluye:

🖥️ Tablet de Check-in/Check-out: ingreso y salida de estudiantes con código QR o manual.

📱 App Web para Estudiantes: gestión de perfil, planes y pagos.

👨‍💼 Panel de Administración: dashboard completo con métricas y control.

💳 Integración con Mercado Pago: pagos seguros y automatizados.

📊 Sistema de métricas: control de asistencia y facturación.

🏗️ Arquitectura
Frontend (React + TypeScript + Vite)

Ubicación: tentcowork-frontend/

Framework: React 18 con TypeScript

Build Tool: Vite

Hosting: Firebase Hosting

Estilos: Tailwind CSS + Framer Motion

Backend (Node.js + Express + Firebase)

Ubicación: tentcowork-backend/

Runtime: Node.js 20+

Framework: Express.js

Hosting: Firebase Cloud Functions (Gen 2)

Base de datos: Firestore

Autenticación: Firebase Auth

🚀 Despliegue Rápido
URLs de Producción (ejemplo TentCowork)

Frontend: https://tentcowork-estudiantes-v2.web.app/

Backend: https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/api

💻 Instalación y Desarrollo
Prerrequisitos

Node.js 20+

Firebase CLI

Git

1. Clonar el repositorio
git clone [URL_DEL_REPO]
cd tent-estudiantes-v2

2. Configurar Firebase
firebase login
firebase use tentcowork-estudiantes-v2

3. Backend - Configuración
cd tentcowork-backend/functions
npm install

# Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase y Mercado Pago

4. Frontend - Configuración
cd ../../tentcowork-frontend
npm install

# Crear archivo de variables de entorno
echo "VITE_BACKEND_URL=https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/api" > .env

5. Desarrollo Local

Backend (Cloud Functions Emulator):

cd tentcowork-backend
firebase emulators:start --only functions


Frontend (Dev Server):

cd tentcowork-frontend
npm run dev

🌐 Despliegue a Producción
Deploy Completo
# Build del frontend
cd tentcowork-frontend
npm run build

# Deploy completo
cd ..
firebase deploy

Deploy Específico
# Solo Backend
firebase deploy --only functions

# Solo Frontend
firebase deploy --only hosting

⚙️ Configuración
Variables de Entorno

Backend (tentcowork-backend/functions/.env):

FIREBASE_PROJECT_ID=tentcowork-estudiantes-v2
MP_ACCESS_TOKEN=tu_access_token_de_mercado_pago
MP_PUBLIC_KEY=tu_public_key_de_mercado_pago
FRONTEND_URL=https://tu-frontend.com
BACKEND_URL=https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/api
NODE_ENV=production


Frontend (tentcowork-frontend/.env):

VITE_BACKEND_URL=https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/api
VITE_MP_PUBLIC_KEY=tu_public_key_de_mercado_pago

📊 Funcionalidades Principales
Para Estudiantes

✅ Check-in/Check-out con código de acceso

✅ Gestión de perfil personal

✅ Visualización de planes disponibles

✅ Contratación y pago de membresías

✅ Historial de sesiones y pagos

Para Administradores

✅ Dashboard con métricas en tiempo real

✅ Gestión de estudiantes (30-40 por día)

✅ Control de pagos y membresías

✅ Estadísticas de uso del coworking

✅ Gestión de planes y precios

Sistema de Pagos

✅ Integración completa con Mercado Pago

✅ Múltiples métodos de pago

✅ Webhooks para confirmación automática

✅ Estados de pago en tiempo real

📈 Métricas del Sistema (ejemplo Tent)

Estudiantes por día: 30-40

Horario de operación: 8:00 - 21:30

Sesiones diarias: ~60-80 check-ins/check-outs

Costo de infraestructura: ~$0-5/mes (tier gratuito)

Performance:

Cold start: ~1-2 segundos

Consultas normales: <500ms

Instancias activas: 1-2 durante horario laboral

🛠️ Tecnologías Utilizadas
Frontend

React 18

TypeScript

Vite

Tailwind CSS

Framer Motion

React Router

Lucide React

Backend

Node.js 20

Express.js

Firebase Functions (Gen 2)

Firestore

Firebase Auth

Mercado Pago SDK

CORS

DevOps & Deployment

Firebase Hosting

Firebase Functions

GitHub

Firebase Console

🔧 Scripts Útiles
# Verificar funciones desplegadas
firebase functions:list

# Logs en tiempo real
firebase functions:log

# Cambiar proyecto
firebase use

# Limpiar builds
cd tentcowork-frontend && rm -rf dist/
cd tentcowork-backend/functions && rm -rf dist/

# Verificar API
curl https://us-central1-tentcowork-estudiantes-v2.cloudfunctions.net/api

🐛 Problemas Comunes
Frontend no carga (pantalla en blanco)

Verificar VITE_BACKEND_URL

Revisar consola del navegador

Confirmar que el build se generó bien

Error 404 en API

Revisar que las rutas usen /api/...

Confirmar que el backend esté desplegado

Probar la URL con curl

Variables de entorno no funcionan

Revisar que .env esté en la carpeta correcta

Reiniciar el servidor de desarrollo

Rebuild del proyecto

📞 Contacto

Autor: Leandro Petricca

Proyecto: TentCowork - Sistema de Membresías

Última actualización: Septiembre 2025

📄 Licencia

Este proyecto es de uso privado. El código es propiedad de Leandro Petricca.
TentCowork tiene licencia de uso, sin exclusividad.
