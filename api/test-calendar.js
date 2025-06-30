import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Iniciando prueba de conexión con Google Calendar...');
    
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('❌ Variables de entorno de Google Calendar no configuradas');
      return res.status(500).json({ 
        error: 'Configuración de Google Calendar incompleta',
        details: 'Faltan las credenciales de Google Calendar',
        variables: {
          CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
          CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
          REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
          REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
        }
      });
    }

    console.log('✅ Variables de entorno verificadas');

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
    );

    console.log('🔐 Configurando credenciales OAuth2...');

    // Usar refresh token para obtener access token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    // Verificar que el access token se obtenga correctamente
    let accessToken;
    try {
      accessToken = await oauth2Client.getAccessToken();
      console.log('✅ Access token obtenido correctamente');
    } catch (tokenError) {
      console.error('❌ Error obteniendo access token:', tokenError);
      return res.status(500).json({ 
        error: 'Error de autenticación con Google',
        details: 'No se pudo obtener el access token. Verifica el refresh token.',
        tokenError: tokenError.message
      });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('📅 Probando acceso al calendario...');

    // Intentar listar calendarios para verificar permisos
    const calendarsResponse = await calendar.calendarList.list();
    console.log('✅ Acceso al calendario verificado');

    // Intentar crear un evento de prueba
    const testEvent = {
      summary: '🧪 Prueba de Conexión - Metro CDMX',
      description: 'Este es un evento de prueba para verificar la conexión con Google Calendar.',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Mañana + 30 min
        timeZone: 'America/Mexico_City',
      },
      location: 'Estación de Prueba, Metro CDMX',
    };

    console.log('🚀 Creando evento de prueba...');

    const testResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: testEvent,
    });

    console.log('✅ Evento de prueba creado exitosamente');

    // Eliminar el evento de prueba
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: testResponse.data.id,
    });

    console.log('🗑️ Evento de prueba eliminado');

    return res.status(200).json({
      success: true,
      message: 'Conexión con Google Calendar exitosa',
      details: {
        accessToken: accessToken.token ? '✅ Válido' : '❌ Inválido',
        calendarAccess: '✅ Verificado',
        eventCreation: '✅ Funcionando',
        eventDeletion: '✅ Funcionando',
        testEventId: testResponse.data.id,
        calendarsAvailable: calendarsResponse.data.items?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error en prueba de Google Calendar:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      status: error.status,
      errors: error.errors
    });
    
    // Manejar errores específicos
    if (error.code === 401) {
      return res.status(500).json({ 
        error: 'Error de autenticación con Google Calendar',
        details: 'El refresh token puede haber expirado. Necesitas generar uno nuevo.',
        solution: 'Ejecuta el script de configuración para obtener un nuevo refresh token'
      });
    }
    
    if (error.code === 403) {
      return res.status(500).json({ 
        error: 'Sin permisos para acceder a Google Calendar',
        details: 'Verifica que la aplicación tenga permisos de lectura y escritura en el calendario',
        solution: 'Revisa los scopes configurados en Google Cloud Console'
      });
    }

    return res.status(500).json({ 
      error: 'Error en la prueba de Google Calendar',
      details: error.message,
      code: error.code
    });
  }
} 