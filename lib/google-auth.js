import { google } from 'googleapis';

/**
 * Crea un cliente OAuth2 con renovación automática de tokens
 */
export async function createGoogleAuthClient() {
  console.log('🔧 Configurando cliente Google OAuth2...');
  
  // Verificar que las variables de entorno estén configuradas
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Variables de entorno de Google Calendar no configuradas');
  }

  // Crear cliente OAuth2
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  // Configurar refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  // Configurar renovación automática de tokens
  oauth2Client.on('tokens', (tokens) => {
    console.log('🔄 Tokens renovados automáticamente');
    if (tokens.refresh_token) {
      console.log('📝 Nuevo refresh token obtenido (actualiza en Vercel si es necesario)');
    }
  });

  return oauth2Client;
}

/**
 * Obtiene un cliente de Google Calendar con autenticación configurada
 */
export async function getGoogleCalendar() {
  const auth = await createGoogleAuthClient();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Maneja errores de autenticación y renueva tokens automáticamente
 */
export async function withTokenRetry(operation, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${maxRetries} de operación Google Calendar`);
      return await operation();
    } catch (error) {
      console.log(`❌ Error en intento ${attempt}:`, error.message);
      lastError = error;
      
      // Si es error de token y no es el último intento, renovar token
      if (attempt < maxRetries && isTokenError(error)) {
        console.log('🔑 Error de token detectado, renovando...');
        try {
          await refreshTokens();
          console.log('✅ Token renovado, reintentando operación...');
          continue;
        } catch (refreshError) {
          console.log('❌ Error renovando token:', refreshError.message);
          throw refreshError;
        }
      }
      
      // Si es el último intento o no es error de token, propagar error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
  
  throw lastError;
}

/**
 * Verifica si un error es relacionado con tokens expirados
 */
function isTokenError(error) {
  if (!error) return false;
  
  const tokenErrorMessages = [
    'invalid_grant',
    'Token has been expired or revoked',
    'unauthorized',
    'invalid_token',
    'token_expired'
  ];
  
  return (
    error.code === 401 ||
    error.status === 401 ||
    tokenErrorMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    )
  );
}

/**
 * Renueva los tokens de Google
 */
async function refreshTokens() {
  console.log('🔄 Renovando tokens de Google Calendar...');
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  // Forzar renovación
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  console.log('✅ Tokens renovados exitosamente');
  console.log('🕐 Nuevo token expira en:', new Date(credentials.expiry_date));
  
  return credentials;
} 