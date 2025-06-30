// Almacenamiento en memoria (se reinicia con cada deploy)
let reservasEnMemoria = [];
let nextId = 1;

// Función para leer reservas (desde memoria)
function leerReservas() {
  return reservasEnMemoria;
}

// Función para escribir reservas (en memoria)
function escribirReservas(reservas) {
  reservasEnMemoria = reservas;
}

// Obtener el siguiente ID
function obtenerSiguienteId() {
  return nextId++;
}

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
    const reservas = leerReservas();
    const { estacion, estado, fecha } = req.query;
    let reservasFiltradas = [...reservas];
    
    if (estacion) {
      reservasFiltradas = reservasFiltradas.filter(r => r.estacion === estacion);
    }
    
    if (estado) {
      reservasFiltradas = reservasFiltradas.filter(r => r.estado === estado);
    }
    
    if (fecha) {
      reservasFiltradas = reservasFiltradas.filter(r => r.fecha === fecha);
    }
    
    return res.status(200).json(reservasFiltradas);
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
    
    const reservas = leerReservas();
    
    const nuevaReserva = {
      id: obtenerSiguienteId(),
      nombre,
      telefono,
      estacion,
      fecha,
      hora,
      productos,
      estado: 'pendiente',
      eventId: eventId || null,
      fechaCreacion: new Date().toISOString()
    };
    
    reservas.push(nuevaReserva);
    escribirReservas(reservas);
    
    return res.status(201).json(nuevaReserva);
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
    
    const reservas = leerReservas();
    const reserva = reservas.find(r => r.id === parseInt(id));
    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    if (estado) {
      reserva.estado = estado;
      escribirReservas(reservas);
    }
    
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
    
    const reservas = leerReservas();
    const index = reservas.findIndex(r => r.id === parseInt(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    reservas.splice(index, 1);
    escribirReservas(reservas);
    
    return res.status(200).json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 