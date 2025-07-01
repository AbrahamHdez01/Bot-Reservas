import { supabase, handleSupabaseError } from '../lib/supabase.js';

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
    const { estado } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de reserva requerido' });
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

// Eliminar reserva
async function eliminarReserva(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de reserva requerido' });
    }
    
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