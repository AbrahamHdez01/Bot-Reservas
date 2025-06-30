import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, estacion, productos, fecha, hora, duracion } = req.body;
  
  if (!nombre || !estacion || !productos || !fecha || !hora || !duracion) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Usar refresh token para obtener access token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Crear evento
    const startTime = new Date(`${fecha}T${hora}:00`);
    const endTime = new Date(startTime.getTime() + (duracion * 60 * 1000));

    const event = {
      summary: `Entrega Metro CDMX - ${nombre}`,
      description: `Cliente: ${nombre}\nEstación: ${estacion}\nProductos: ${productos.join(', ')}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      location: estacion,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 30 }, // 30 minutos antes
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return res.status(200).json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      message: 'Evento creado exitosamente en Google Calendar'
    });

  } catch (error) {
    console.error('Error en Google Calendar API:', error);
    return res.status(500).json({ 
      error: 'Error al crear evento en Google Calendar',
      details: error.message 
    });
  }
} 