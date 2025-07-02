import { getGoogleCalendar, withTokenRetry } from '../lib/google-auth.js';
import { supabase, handleSupabaseError } from '../lib/supabase.js';

function to24Hour(hora) {
  // Si ya es formato 24h, regresa igual
  if (/^\d{2}:\d{2}$/.test(hora)) return hora;
  // Si es formato 12h con AM/PM
  const match = hora.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return hora;
  let [_, h, m, ampm] = match;
  h = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m}`;
}

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
    
    // Usar la función con renovación automática de tokens
    const result = await withTokenRetry(async () => {
      const calendar = await getGoogleCalendar();
      
      // Formatear productos para la descripción
      const productosDesc = productos.map(p => `${p.nombre} (${p.cantidad}x $${p.precio})`).join('\n');
      const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

      console.log('📅 Preparando evento...');

      // Usar la hora recibida tal cual (ya en formato HH:MM)
      const hora24 = hora;
      // Construir dateTime en formato local
      const startDateTime = `${fecha}T${hora24}:00`;
      const endDateTime = calcularFinEvento(startDateTime, 30); // 30 minutos después

      // Estado inicial
      const estadoEvento = 'POR CONFIRMAR';

      const event = {
        summary: `🚇 Entrega Metro CDMX - ${estadoEvento} - ${nombre}`,
        description: `Estado: ${estadoEvento}\nCliente: ${nombre}\nTeléfono: ${telefono}\nEstación: ${estacion}\nFecha: ${fecha}\nHora: ${hora}\n\nProductos:\n${productosDesc}\n\nTotal: $${total}\n\n--- Reserva creada automáticamente ---`,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: endDateTime,
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

      return response;
    });

    // Guardar reserva en Supabase
    console.log('💾 Guardando reserva en base de datos...');
    
    const nuevaReserva = {
      nombre,
      telefono,
      estacion,
      fecha,
      hora: to24Hour(hora),
      productos,
      estado: 'pendiente',
      calendar_event_id: result.data.id
    };

    const { data: reserva, error: dbError } = await supabase
      .from('reservas')
      .insert([nuevaReserva])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error guardando en base de datos:', dbError);
      // Aunque falle la base de datos, el evento ya está en Google Calendar
      return res.status(200).json({
        success: true,
        eventId: result.data.id,
        eventLink: result.data.htmlLink,
        message: 'Evento creado en Google Calendar, pero hubo un error guardando en la base de datos',
        dbError: handleSupabaseError(dbError)
      });
    }

    console.log('✅ Reserva guardada en base de datos:', reserva.id);

    return res.status(200).json({
      success: true,
      eventId: result.data.id,
      eventLink: result.data.htmlLink,
      reservaId: reserva.id,
      message: 'Evento creado exitosamente en Google Calendar y reserva guardada'
    });

  } catch (error) {
    console.error('❌ Error en Google Calendar API:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      status: error.status,
      errors: error.errors
    });
    
    // Manejar errores específicos
    if (error.message?.includes('Variables de entorno de Google Calendar no configuradas')) {
      return res.status(500).json({ 
        error: 'Configuración de Google Calendar incompleta',
        details: 'Faltan las credenciales de Google Calendar'
      });
    }
    
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(500).json({ 
        error: 'Error de autenticación con Google Calendar',
        details: 'Los tokens han expirado. Se intentó renovar automáticamente pero falló. Contacta al administrador.'
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

// Función para sumar minutos a un string dateTime local
function calcularFinEvento(startDateTime, minutos) {
  const [fecha, hora] = startDateTime.split('T');
  const [h, m, s] = hora.split(':');
  const date = new Date(`${fecha}T${hora}`);
  date.setMinutes(date.getMinutes() + minutos);
  // Formatear de vuelta a YYYY-MM-DDTHH:MM:SS
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
} 