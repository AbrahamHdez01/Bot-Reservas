# 🚇 Metro CDMX Delivery - Sistema de Reservas

Sistema completo de reservas para entregas en el Metro de la Ciudad de México con optimización de rutas e integración con Google Calendar.

## ✨ Características

- 🗺️ **Optimización de Rutas**: Algoritmo que calcula tiempos de tránsito entre estaciones
- 📅 **Google Calendar**: Integración automática para crear eventos con estados de confirmación
- 🎨 **Interfaz Moderna**: Diseño responsivo y amigable
- 📱 **Multiplataforma**: Funciona en móviles y desktop
- 🔒 **Seguridad**: Validación de horarios y protección de datos
- 👨‍💼 **Panel de Administración**: Gestión completa de reservas con confirmación
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
# Google Calendar API (OPCIONAL - la app funciona sin esto)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=tu_redirect_uri
GOOGLE_REFRESH_TOKEN=tu_refresh_token

# Google Maps API (OPCIONAL - la app funciona sin esto)
GOOGLE_MAPS_API_KEY=tu_maps_api_key

# Servidor
PORT=5000
NODE_ENV=development

# Base de datos
DATABASE_URL=./database.sqlite

# Seguridad
JWT_SECRET=tu_jwt_secret
ADMIN_PASSWORD=tu_contraseña_admin
```

### 🔧 Configuración Mínima

**Para que la aplicación funcione básicamente, solo necesitas:**
```bash
PORT=5000
NODE_ENV=development
ADMIN_PASSWORD=tu_contraseña_admin
```

**Las APIs de Google son opcionales:**
- **Sin Google Calendar**: Las reservas se guardan solo en la base de datos
- **Sin Google Maps**: Se usan tiempos simulados para las rutas
- **Con ambas APIs**: Funcionalidad completa con calendario y rutas reales

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
- `ADMIN_PASSWORD=tu_contraseña_admin`
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
│   │   ├── AdminPanel.js  # Panel de administración
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
  - `id`: Identificador único
  - `customer_name`: Nombre del cliente
  - `customer_phone`: Teléfono del cliente
  - `products`: Productos solicitados
  - `metro_station`: Estación de metro
  - `delivery_date`: Fecha de entrega
  - `delivery_time`: Hora de entrega
  - `status`: Estado de la reserva ('pending' o 'confirmed')
  - `google_calendar_event_id`: ID del evento en Google Calendar
  - `created_at`: Fecha de creación

- **metro_stations**: Estaciones del Metro CDMX

### Estaciones Incluidas
- Línea 1: Observatorio → Pantitlán
- Línea 2: Cuatro Caminos → Tasqueña

## 🎯 Funcionalidades

### Reservas
- ✅ Selección múltiple de productos
- ✅ Búsqueda de estaciones
- ✅ Validación de horarios (20 min mínimo)
- ✅ Validación de anticipación (1 día mínimo)
- ✅ Integración con Google Calendar
- ✅ Sistema de confirmación de reservas
- ✅ Notificaciones en tiempo real

### Panel de Administración
- ✅ Acceso protegido por contraseña
- ✅ Vista de todas las reservas
- ✅ Estadísticas de reservas (total, pendientes, confirmadas)
- ✅ Confirmación de reservas
- ✅ Actualización automática en Google Calendar
- ✅ Interfaz moderna y responsiva

### Optimización
- ✅ Cálculo de rutas con Google Maps
- ✅ Tiempos de tránsito entre estaciones
- ✅ Validación de disponibilidad

### Interfaz
- ✅ Diseño responsivo
- ✅ Formularios intuitivos
- ✅ Animaciones suaves
- ✅ Accesibilidad

## 🔄 Flujo de Trabajo

### 1. Usuario crea una reserva:
- Completa el formulario (nombre, teléfono, productos, estación, fecha/hora)
- Sistema valida: mínimo 1 día de anticipación y 20 min entre entregas
- Se guarda en base de datos con status `pending`
- Se crea evento en Google Calendar con título "[POR CONFIRMAR]"

### 2. Admin accede al panel:
- Inicia sesión con contraseña en `/admin`
- Ve todas las reservas con estadísticas
- Puede confirmar reservas pendientes

### 3. Admin confirma una reserva:
- Se actualiza status a `confirmed` en base de datos
- Se actualiza evento en Google Calendar a "[CONFIRMADA]"
- Se muestra notificación de éxito

## 🚨 Notas Importantes

### Seguridad
- ⚠️ Nunca subas credenciales a GitHub
- ⚠️ Usa solo variables de entorno
- ⚠️ Restringe las APIs a tu dominio
- ⚠️ Cambia la contraseña de admin por defecto

### Limitaciones
- 📱 Solo estaciones de Líneas 1 y 2
- ⏰ Horarios de 9:00 AM a 8:00 PM
- 🕐 Mínimo 20 minutos entre entregas
- 📅 Mínimo 1 día de anticipación

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

### Error de Panel de Admin
- Verifica que ADMIN_PASSWORD esté configurada
- Confirma que la contraseña sea correcta

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Confirma que las APIs estén habilitadas
4. Revisa la documentación de Google APIs

## 📄 Licencia

MIT License - Libre para uso comercial y personal.

---

**Desarrollado por Abraham Martinez Hernandez ** 