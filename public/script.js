// Cargar estaciones y productos
async function cargarDatos() {
  const metroStations = await fetch('/metro_stations.json').then(r => r.json());
  const productos = await fetch('/productos.json').then(r => r.json());
  
  // Filtrar solo estaciones disponibles y aplanar la estructura
  const estaciones = [];
  Object.entries(metroStations).forEach(([linea, stations]) => {
    stations.forEach(station => {
      if (station.available) {
        estaciones.push({
          nombre: station.name,
          linea: linea
        });
      }
    });
  });
  
  return { estaciones, productos };
}

// Renderizar estaciones
function renderEstaciones(estaciones) {
  const select = document.getElementById('estacion');
  select.innerHTML = '';
  estaciones.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.nombre;
    opt.textContent = `${e.nombre} (Línea ${e.linea})`;
    select.appendChild(opt);
  });
}

// Renderizar productos
function renderProductos(productos) {
  const cont = document.getElementById('productos');
  cont.innerHTML = '';
  Object.entries(productos).forEach(([cat, items]) => {
    const group = document.createElement('div');
    group.innerHTML = `<strong>${cat.replace('_', ' ').toUpperCase()}:</strong><br>`;
    items.forEach(prod => {
      const id = `${cat}-${prod}`.replace(/\W+/g, '');
      group.innerHTML += `<label><input type="checkbox" name="producto" value="${prod}"> ${prod}</label><br>`;
    });
    cont.appendChild(group);
  });
}

// Validar teléfono
function validarTelefono(telefono) {
  const telefonoLimpio = telefono.replace(/\D/g, '');
  if (telefonoLimpio.length !== 10) {
    return 'El teléfono debe tener exactamente 10 dígitos.';
  }
  return '';
}

// Validar fecha y hora
function validarFechaHora(fecha, hora) {
  const dt = new Date(`${fecha}T${hora}`);
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  if (dt <= hoy) return 'La fecha debe ser posterior a hoy.';
  if (![1,2,3].includes(dt.getDay())) return 'Solo se permiten reservas de lunes a miércoles.';
  const h = parseInt(hora.split(':')[0], 10);
  if (h < 10 || h > 18) return 'Solo se permiten reservas entre 10:00 y 18:00.';
  return '';
}

// Consultar Directions API real
async function calcularETA(origen, destino) {
  try {
    const response = await fetch('/api/directions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origen, destino })
    });
    
    if (!response.ok) {
      throw new Error('Error en la API de direcciones');
    }
    
    const data = await response.json();
    return { minutos: data.minutos, texto: data.texto };
  } catch (error) {
    console.error('Error calculando ETA:', error);
    // Fallback a simulación
    return { minutos: 30, texto: '30 minutos (estimado)' };
  }
}

// Insertar en Google Calendar real
async function insertarEnGoogleCalendar({nombre, estacion, productos, fecha, hora, duracion}) {
  try {
    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre, estacion, productos, fecha, hora, duracion })
    });
    
    if (!response.ok) {
      throw new Error('Error en la API de calendario');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { estaciones, productos } = await cargarDatos();
  renderEstaciones(estaciones);
  renderProductos(productos);

  document.getElementById('reserva-form').onsubmit = async e => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const estacion = document.getElementById('estacion').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const productosSel = Array.from(document.querySelectorAll('input[name=producto]:checked')).map(i => i.value);

    if (!nombre || !telefono || !estacion || !fecha || !hora || productosSel.length === 0) {
      document.getElementById('resultado').textContent = 'Completa todos los campos.';
      return;
    }
    
    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) {
      document.getElementById('resultado').textContent = errorTelefono;
      return;
    }
    
    const error = validarFechaHora(fecha, hora);
    if (error) {
      document.getElementById('resultado').textContent = error;
      return;
    }

    // Calcular ETA (simulado)
    const origen = 'Centro Histórico CDMX';
    const destino = estacion;
    const eta = await calcularETA(origen, destino);

    if (!confirm(`El tiempo estimado de llegada es ${eta.texto}. ¿Deseas continuar?`)) return;

    try {
      const resultado = await insertarEnGoogleCalendar({
        nombre, estacion, productos: productosSel, fecha, hora, duracion: eta.minutos + 10
      });
      
      // Guardar reserva en la API
      const reservaGuardada = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          telefono,
          estacion,
          fecha,
          hora,
          productos: productosSel,
          eventId: resultado.eventId
        })
      });
      
      if (!reservaGuardada.ok) {
        throw new Error('Error guardando la reserva');
      }
      
      document.getElementById('resultado').innerHTML = `
        <div style="background: #d4edda; color: #155724; padding: 1em; border-radius: 4px; margin: 1em 0;">
          <h3>¡Reserva creada exitosamente!</h3>
          <p><strong>Cliente:</strong> ${nombre}</p>
          <p><strong>Teléfono:</strong> ${telefono}</p>
          <p><strong>Estación:</strong> ${estacion}</p>
          <p><strong>Fecha:</strong> ${fecha} a las ${hora}</p>
          <p><strong>Productos:</strong> ${productosSel.join(', ')}</p>
          <p><strong>Duración estimada:</strong> ${eta.minutos + 10} minutos</p>
          <p><a href="${resultado.eventLink}" target="_blank">Ver evento en Google Calendar</a></p>
        </div>
      `;
      e.target.reset();
    } catch (error) {
      document.getElementById('resultado').innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 1em; border-radius: 4px; margin: 1em 0;">
          <h3>Error al crear la reserva</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  };
}); 