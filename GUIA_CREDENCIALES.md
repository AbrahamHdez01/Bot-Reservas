# 🔐 Guía Completa: Configuración de Credenciales Google APIs

## 🎯 **Objetivo**
Configurar las credenciales necesarias para que tu aplicación [Metro CDMX Delivery](https://bot-reservas-0zur.onrender.com) funcione completamente con Google Calendar y Google Maps.

---

## 📋 **Paso 1: Crear Proyecto en Google Cloud Console**

### 1.1 Acceder a Google Cloud Console
- Ve a [console.cloud.google.com](https://console.cloud.google.com)
- Inicia sesión con tu cuenta de Google

### 1.2 Crear Nuevo Proyecto
- Haz clic en el selector de proyectos (arriba a la izquierda)
- Selecciona **"Nuevo proyecto"**
- **Nombre del proyecto:** `Metro CDMX Delivery`
- Haz clic en **"Crear"**

---

## 🔧 **Paso 2: Habilitar APIs Necesarias**

### 2.1 Ir a la Biblioteca de APIs
- En el menú lateral, ve a **"APIs y servicios" > "Biblioteca"**

### 2.2 Habilitar Google Calendar API
- Busca **"Google Calendar API"**
- Haz clic en el resultado
- Haz clic en **"Habilitar"**

### 2.3 Habilitar Google Maps Directions API
- Busca **"Google Maps Directions API"**
- Haz clic en el resultado
- Haz clic en **"Habilitar"**

---

## 🔐 **Paso 3: Configurar Pantalla de Consentimiento OAuth**

### 3.1 Ir a Credenciales
- Ve a **"APIs y servicios" > "Credenciales"**
- Haz clic en **"Configurar pantalla de consentimiento"**

### 3.2 Configurar Información Básica
- **Tipo de usuario:** Selecciona **"Externo"**
- Haz clic en **"Crear"**

### 3.3 Información de la Aplicación
- **Nombre de la aplicación:** `Metro CDMX Delivery`
- **Correo electrónico de soporte:** Tu email
- **Logo de la aplicación:** (opcional)
- Haz clic en **"Guardar y continuar"**

### 3.4 Ámbitos (Scopes)
- Haz clic en **"Guardar y continuar"** (no necesitas agregar scopes aquí)

### 3.5 Usuarios de prueba
- Haz clic en **"Guardar y continuar"** (no necesitas agregar usuarios de prueba)

### 3.6 Resumen
- Revisa la información
- Haz clic en **"Volver al panel"**

---

## 🎫 **Paso 4: Crear Credenciales OAuth 2.0**

### 4.1 Crear ID de Cliente
- En **"APIs y servicios" > "Credenciales"**
- Haz clic en **"Crear credenciales" > "ID de cliente de OAuth 2.0"**

### 4.2 Configurar Aplicación Web
- **Tipo de aplicación:** Selecciona **"Aplicación web"**
- **Nombre:** `Metro CDMX Delivery`

### 4.3 Orígenes autorizados de JavaScript
Agrega estas URLs:
```
https://bot-reservas-0zur.onrender.com
http://localhost:3000
http://localhost:5000
http://localhost:3001
```

### 4.4 URIs de redireccionamiento autorizados
Agrega estas URLs:
```
https://bot-reservas-0zur.onrender.com/auth/google/callback
http://localhost:3000/auth/google/callback
http://localhost:5000/auth/google/callback
http://localhost:3001/auth/google/callback
```

### 4.5 Crear Credenciales
- Haz clic en **"Crear"**
- **Guarda el CLIENT_ID y CLIENT_SECRET** que aparecen

---

## 🗺️ **Paso 5: Crear Google Maps API Key**

### 5.1 Crear Clave de API
- En **"APIs y servicios" > "Credenciales"**
- Haz clic en **"Crear credenciales" > "Clave de API"**

### 5.2 Restringir la Clave
- Haz clic en **"Restringir clave"**
- **Restricción de aplicación:** Selecciona **"Sitios web"**
- **Referencias de sitios web:** Agrega:
  ```
  https://bot-reservas-0zur.onrender.com/*
  ```
- Haz clic en **"Guardar"**
- **Guarda la API KEY** que aparece

---

## 🔑 **Paso 6: Obtener Refresh Token**

### 6.1 Instalar Dependencias
```bash
npm install express googleapis
```

### 6.2 Editar el Script
- Abre el archivo `get-refresh-token.js`
- Reemplaza:
  - `TU_CLIENT_ID_AQUI` con tu CLIENT_ID
  - `TU_CLIENT_SECRET_AQUI` con tu CLIENT_SECRET

### 6.3 Ejecutar el Script
```bash
node get-refresh-token.js
```

### 6.4 Obtener el Token
- Abre tu navegador en: `http://localhost:3001`
- Haz clic en **"Autorizar Google Calendar"**
- Inicia sesión con tu cuenta de Google
- Autoriza los permisos
- **Copia el refresh token** que aparece

---

## ⚙️ **Paso 7: Configurar Variables en Render**

### 7.1 Ir a tu Aplicación en Render
- Ve a [dashboard.render.com](https://dashboard.render.com)
- Selecciona tu aplicación `metro-cdmx-delivery`

### 7.2 Ir a Environment Variables
- En el menú lateral, ve a **"Environment"**
- Haz clic en **"Environment Variables"**

### 7.3 Agregar Variables
Agrega estas variables una por una:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `GOOGLE_CLIENT_ID` | Tu CLIENT_ID |
| `GOOGLE_CLIENT_SECRET` | Tu CLIENT_SECRET |
| `GOOGLE_REDIRECT_URI` | `https://bot-reservas-0zur.onrender.com/auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | Tu refresh token |
| `GOOGLE_MAPS_API_KEY` | Tu API key de Google Maps |

### 7.4 Guardar Cambios
- Haz clic en **"Save Changes"**
- Render reiniciará automáticamente tu aplicación

---

## ✅ **Paso 8: Verificar Funcionamiento**

### 8.1 Probar la Aplicación
- Ve a [https://bot-reservas-0zur.onrender.com](https://bot-reservas-0zur.onrender.com)
- Intenta crear una reserva
- Verifica que se cree en Google Calendar

### 8.2 Verificar Logs
- En Render, ve a **"Logs"**
- Revisa que no haya errores relacionados con Google APIs

---

## 🔒 **Notas de Seguridad**

### ⚠️ Importante
- **Nunca subas credenciales a GitHub**
- **Usa solo variables de entorno en Render**
- **Restringe las APIs a tu dominio específico**
- **El refresh token no expira a menos que lo revoques**

### 🛡️ Buenas Prácticas
- Revisa regularmente el uso de las APIs
- Monitorea los logs de Render
- Mantén actualizadas las dependencias

---

## 🐛 **Solución de Problemas**

### Error: "Invalid Credentials"
- Verifica que las credenciales estén correctas
- Confirma que las APIs estén habilitadas
- Revisa las restricciones de dominio

### Error: "Refresh Token Invalid"
- Genera un nuevo refresh token
- Verifica que el token no haya sido revocado

### Error: "API Quota Exceeded"
- Revisa el uso en Google Cloud Console
- Considera actualizar a un plan de pago si es necesario

---

## 📞 **Soporte**

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Confirma que las APIs estén habilitadas
4. Revisa la documentación oficial de Google APIs

---

**¡Listo! Tu aplicación Metro CDMX Delivery estará completamente funcional con Google Calendar y Google Maps.** 🚇✨ 