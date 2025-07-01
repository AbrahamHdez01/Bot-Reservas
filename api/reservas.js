import { supabase, handleSupabaseError } from '../lib/supabase.js';
import { google } from 'googleapis';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return obtenerReservas(req, res);
    case 'POST':
      return crearReserva(req, res);
    case 'PUT':
      return actualizarReserva(req, res);
    case 'DELETE':
      return eliminarReserva(req, res);
    default:
      return res.status(405).json({ error: 'Método no permitido' });
  }
}

// Obtener todas las reservas
async function obtenerReservas(req, res) {
  try {
    const { estacion, estado, fecha } = req.query;
    
    let query = supabase
      .from('reservas')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Aplicar filtros si se proporcionan
    if (estacion) {
      query = query.eq('estacion', estacion);
    }
    
    if (estado) {
      query = query.eq('estado', estado);
    }
    
    if (fecha) {
      query = query.eq('fecha', fecha);
    }
    
    const { data: reservas, error } = await query;
    
    if (error) {
      const errorResponse = handleSupabaseError(error);
      return res.status(500).json(errorResponse);
    }
    
    console.log(`✅ ${reservas.length} reservas obtenidas`);
    return res.status(200).json(reservas);
    
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Crear nueva reserva
async function crearReserva(req, res) {
  try {
    const { nombre, telefono, estacion, fecha, hora, productos, eventId } = req.body;
    
    if (!nombre || !telefono || !estacion || !fecha || !hora || !productos) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const nuevaReserva = {
      nombre,
      telefono,
      estacion,
      fecha,
      hora,
      productos,
      estado: 'pendiente',
      calendar_event_id: eventId || null
    };
    
    const { data: reserva, error } = await supabase
      .from('reservas')
      .insert([nuevaReserva])
      .select()
      .single();
    
    if (error) {
      const errorResponse = handleSupabaseError(error);
      return res.status(500).json(errorResponse);
    }
    
    console.log('✅ Nueva reserva creada:', reserva.id);
    return res.status(201).json(reserva);
    
  } catch (error) {
    console.error('Error creando reserva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Actualizar reserva
async function actualizarReserva(req, res) {
  try {
    const { id } = req.query;
    let { estado } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID de reserva requerido' });
    }
    // Cambiar 'completada' a 'confirmado' para consistencia
    if (estado === 'completada') estado = 'confirmado';
    // Si se confirma, actualizar el evento de Calendar
    if (estado === 'confirmado') {
      // Obtener la reserva para el eventId
      const { data: reservaActual, error: errorGet } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', id)
        .single();
      if (!errorGet && reservaActual && reservaActual.calendar_event_id) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
          );
          oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          // Actualizar el evento
          await calendar.events.patch({
            calendarId: 'primary',
            eventId: reservaActual.calendar_event_id,
            requestBody: {
              summary: `🚇 Entrega Metro CDMX - CONFIRMADO - ${reservaActual.nombre}`,
              description: `Estado: CONFIRMADO\nCliente: ${reservaActual.nombre}\nTeléfono: ${reservaActual.telefono}\nEstación: ${reservaActual.estacion}\nFecha: ${reservaActual.fecha}\nHora: ${reservaActual.hora}\n\nProductos:\n${Array.isArray(reservaActual.productos) ? reservaActual.productos.map(p => `${p.nombre} (${p.cantidad}x $${p.precio})`).join('\n') : ''}\n\nTotal: $${Array.isArray(reservaActual.productos) ? reservaActual.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0) : ''}\n\n--- Reserva actualizada automáticamente ---`,
            }
          });
        } catch (err) {
          console.error('Error actualizando evento de Calendar:', err);
        }
      }
    }
    const updateData = {};
    if (estado) {
      updateData.estado = estado;
    }
    const { data: reserva, error } = await supabase
      .from('reservas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }
      const errorResponse = handleSupabaseError(error);
      return res.status(500).json(errorResponse);
    }
    console.log(`✅ Estado de reserva ${id} actualizado a: ${estado}`);
    return res.status(200).json(reserva);
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Eliminar reserva (y evento de calendar si aplica)
async function eliminarReserva(req, res) {
  try {
    const { id, calendar_event_id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID de reserva requerido' });
    }
    // Si hay calendar_event_id, eliminar de Google Calendar
    if (calendar_event_id) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
        );
        oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: calendar_event_id
        });
        console.log(`🗑️ Evento de Calendar ${calendar_event_id} eliminado`);
      } catch (err) {
        console.error('Error eliminando evento de Calendar:', err);
      }
    }
    // Eliminar reserva de la base de datos
    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);
    if (error) {
      const errorResponse = handleSupabaseError(error);
      return res.status(500).json(errorResponse);
    }
    console.log(`🗑️ Reserva ${id} eliminada`);
    return res.status(200).json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Endpoint para autenticación admin
export async function config(req, res) {
  if (req.method === 'POST') {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  } else {
    return res.status(405).json({ error: 'Método no permitido' });
  }
} 