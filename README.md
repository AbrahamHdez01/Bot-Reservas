# 🚇 Metro CDMX Delivery - Sistema de Reservas

Sistema completo de reservas para entregas en el Metro de la Ciudad de México con optimización de rutas e integración con Google Calendar.

## ✨ Características

- 🗺️ **Optimización de Rutas**: Algoritmo que calcula tiempos de tránsito entre estaciones
- 📅 **Google Calendar**: Integración automática para crear eventos
- 🎨 **Interfaz Moderna**: Diseño responsivo y amigable
- 📱 **Multiplataforma**: Funciona en móviles y desktop
- 🔒 **Seguridad**: Validación de horarios y protección de datos
- 🚀 **Despliegue**: Optimizado para Render

## 🛠️ Tecnologías

### Backend
- **Node.js** + **Express**
- **SQLite** (Base de datos)
- **Google APIs** (Calendar + Maps)
- **Moment.js** (Manejo de fechas)

### Frontend
- **React** + **JavaScript**
- **React DatePicker** (Calendario)
- **React Select** (Selección múltiple)
- **Lucide React** (Iconos)
- **React Hot Toast** (Notificaciones)

## 🚀 Instalación Local

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd metro-cdmx-delivery
```

### 2. Instalar dependencias
```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
cd client
npm install
cd ..
```

### 3. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp env.example .env

# Editar las variables (ver sección de configuración)
nano .env
```

### 4. Ejecutar en desarrollo
```bash
# Terminal 1: Servidor backend
npm run dev

# Terminal 2: Cliente frontend
cd client
npm start
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Google Calendar API
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=tu_redirect_uri
GOOGLE_REFRESH_TOKEN=tu_refresh_token

# Google Maps API
GOOGLE_MAPS_API_KEY=tu_maps_api_key

# Servidor
PORT=5000
NODE_ENV=development

# Base de datos
DATABASE_URL=./database.sqlite

# Seguridad
JWT_SECRET=tu_jwt_secret
```

## 🌐 Despliegue en Render

### 1. Preparar el repositorio
```bash
# Asegúrate de que todos los cambios estén commitados
git add .
git commit -m "Preparar para despliegue en Render"
git push origin main
```

### 2. Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Crea una cuenta gratuita
3. Conecta tu repositorio de GitHub

### 3. Crear nuevo Web Service
1. Haz clic en "New" > "Web Service"
2. Conecta tu repositorio
3. Configura:
   - **Name**: `metro-cdmx-delivery`
   - **Environment**: `Node`
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### 4. Configurar variables de entorno en Render
En la sección "Environment Variables" agrega:
- `NODE_ENV=production`
- `PORT=10000`
- Todas las variables de Google APIs (ver sección de configuración)

## 🔐 Configuración de Google APIs

### 1. Google Cloud Console
1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuevo proyecto
3. Habilita las APIs:
   - Google Calendar API
   - Google Maps Directions API

### 2. Crear Credenciales OAuth 2.0
1. Ve a "APIs y servicios" > "Credenciales"
2. "Crear credenciales" > "ID de cliente de OAuth 2.0"
3. Tipo: "Aplicación web"
4. Configurar URIs de redirección:
   ```
   https://tu-app.onrender.com/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```

### 3. Obtener Refresh Token
Usa el script `get-refresh-token.js` (ver sección de scripts)

### 4. Google Maps API Key
1. "Crear credenciales" > "Clave de API"
2. Restringir a tu dominio de Render

## 📁 Estructura del Proyecto

```
metro-cdmx-delivery/
├── server.js              # Servidor principal
├── package.json           # Dependencias del servidor
├── client/                # Frontend React
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   ├── App.css        # Estilos
│   │   └── index.js       # Punto de entrada
│   ├── public/
│   │   └── index.html     # Template HTML
│   └── package.json       # Dependencias del cliente
├── render.yaml            # Configuración Render
├── .gitignore             # Archivos ignorados
├── env.example            # Template variables
└── README.md              # Este archivo
```

## 🔧 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Servidor en desarrollo
npm start            # Servidor en producción
cd client && npm start  # Cliente React
```

### Build
```bash
npm run build        # Build del cliente
npm run install-client  # Instalar dependencias del cliente
```

## 📊 Base de Datos

### Tablas
- **bookings**: Reservas de entregas
- **metro_stations**: Estaciones del Metro CDMX

### Estaciones Incluidas
- Línea 1: Observatorio → Pantitlán
- Línea 2: Cuatro Caminos → Tasqueña

## 🎯 Funcionalidades

### Reservas
- ✅ Selección múltiple de productos
- ✅ Búsqueda de estaciones
- ✅ Validación de horarios (20 min mínimo)
- ✅ Integración con Google Calendar
- ✅ Notificaciones en tiempo real

### Optimización
- ✅ Cálculo de rutas con Google Maps
- ✅ Tiempos de tránsito entre estaciones
- ✅ Validación de disponibilidad

### Interfaz
- ✅ Diseño responsivo
- ✅ Formularios intuitivos
- ✅ Animaciones suaves
- ✅ Accesibilidad

## 🚨 Notas Importantes

### Seguridad
- ⚠️ Nunca subas credenciales a GitHub
- ⚠️ Usa solo variables de entorno
- ⚠️ Restringe las APIs a tu dominio

### Limitaciones
- 📱 Solo estaciones de Líneas 1 y 2
- ⏰ Horarios de 9:00 AM a 8:00 PM
- 🕐 Mínimo 20 minutos entre entregas

## 🐛 Solución de Problemas

### Error de Google Calendar
- Verifica que el refresh token sea válido
- Confirma que la API esté habilitada
- Revisa los permisos de la aplicación

### Error de Google Maps
- Verifica que la API key sea válida
- Confirma que Directions API esté habilitada
- Revisa las restricciones de dominio

### Error de Base de Datos
- Verifica que el archivo database.sqlite tenga permisos de escritura
- Confirma que la ruta sea correcta

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Confirma que las APIs estén habilitadas
4. Revisa la documentación de Google APIs

## 📄 Licencia

MIT License - Libre para uso comercial y personal.

---

**Desarrollado con ❤️ para el Metro CDMX** 