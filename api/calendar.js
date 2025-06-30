import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, telefono, estacion, productos, fecha, hora } = req.body;
  
  if (!nombre || !telefono || !estacion || !productos || !fecha || !hora) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    console.log('🔧 Iniciando creación de evento en Google Calendar...');
    
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('❌ Variables de entorno de Google Calendar no configuradas');
      console.log('Variables disponibles:', {
        CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
      });
      return res.status(500).json({ 
        error: 'Configuración de Google Calendar incompleta',
        details: 'Faltan las credenciales de Google Calendar'
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
    try {
      const accessToken = await oauth2Client.getAccessToken();
      console.log('✅ Access token obtenido correctamente');
    } catch (tokenError) {
      console.error('❌ Error obteniendo access token:', tokenError);
      return res.status(500).json({ 
        error: 'Error de autenticación con Google',
        details: 'No se pudo obtener el access token. Verifica el refresh token.'
      });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Formatear productos para la descripción
    const productosDesc = productos.map(p => `${p.nombre} (${p.cantidad}x $${p.precio})`).join('\n');
    const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

    console.log('📅 Preparando evento...');

    // Crear evento
    const startTime = new Date(`${fecha}T${hora}:00`);
    const endTime = new Date(startTime.getTime() + (30 * 60 * 1000)); // 30 minutos de duración

    const event = {
      summary: `🚇 Entrega Metro CDMX - ${nombre}`,
      description: `Cliente: ${nombre}
Teléfono: ${telefono}
Estación: ${estacion}
Fecha: ${fecha}
Hora: ${hora}

Productos:
${productosDesc}

Total: $${total}

--- Reserva creada automáticamente ---`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      location: `Estación ${estacion}, Metro CDMX`,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 30 }, // 30 minutos antes
        ],
      },
    };

    console.log('🚀 Insertando evento en Google Calendar...');
    console.log('Evento:', JSON.stringify(event, null, 2));

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('✅ Evento creado exitosamente en Google Calendar:', response.data.id);
    console.log('🔗 Link del evento:', response.data.htmlLink);

    return res.status(200).json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      message: 'Evento creado exitosamente en Google Calendar'
    });

  } catch (error) {
    console.error('❌ Error en Google Calendar API:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      status: error.status,
      errors: error.errors
    });
    
    // Manejar errores específicos de autenticación
    if (error.code === 401) {
      return res.status(500).json({ 
        error: 'Error de autenticación con Google Calendar',
        details: 'El refresh token puede haber expirado. Necesitas generar uno nuevo.'
      });
    }
    
    if (error.code === 403) {
      return res.status(500).json({ 
        error: 'Sin permisos para crear eventos en Google Calendar',
        details: 'Verifica que la aplicación tenga permisos de escritura en el calendario'
      });
    }

    if (error.code === 400) {
      return res.status(500).json({ 
        error: 'Error en los datos del evento',
        details: error.message
      });
    }

    return res.status(500).json({ 
      error: 'Error al crear evento en Google Calendar',
      details: error.message 
    });
  }
} 