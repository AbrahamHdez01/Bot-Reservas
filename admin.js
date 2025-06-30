// Array para almacenar las reservas
let reservas = [];

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', async () => {
  await cargarEstaciones();
  await cargarReservas();
  actualizarEstadisticas();
  renderizarReservas();
});

// Cargar estaciones para el filtro
async function cargarEstaciones() {
  try {
    const metroStations = await fetch('metro_stations.json').then(r => r.json());
    const estaciones = [];
    Object.entries(metroStations).forEach(([linea, stations]) => {
      stations.forEach(station => {
        if (station.available) {
          estaciones.push(station.name);
        }
      });
    });
    
    const select = document.getElementById('filter-estacion');
    estaciones.forEach(estacion => {
      const option = document.createElement('option');
      option.value = estacion;
      option.textContent = estacion;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando estaciones:', error);
  }
}

// Cargar reservas desde la API
async function cargarReservas() {
  try {
    const response = await fetch('/api/reservas');
    if (response.ok) {
      reservas = await response.json();
    } else {
      console.error('Error cargando reservas:', response.statusText);
    }
  } catch (error) {
    console.error('Error cargando reservas:', error);
  }
}

// Actualizar estadísticas
function actualizarEstadisticas() {
  const hoy = new Date().toISOString().split('T')[0];
  
  document.getElementById('total-reservas').textContent = reservas.length;
  document.getElementById('reservas-hoy').textContent = reservas.filter(r => r.fecha === hoy).length;
  document.getElementById('reservas-pendientes').textContent = reservas.filter(r => r.estado === 'pendiente').length;
  document.getElementById('reservas-completadas').textContent = reservas.filter(r => r.estado === 'completada').length;
}

// Renderizar tabla de reservas
function renderizarReservas(reservasFiltradas = reservas) {
  const tbody = document.getElementById('reservas-tbody');
  tbody.innerHTML = '';
  
  reservasFiltradas.forEach(reserva => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${reserva.id}</td>
      <td>${reserva.nombre}</td>
      <td>${reserva.telefono}</td>
      <td>${reserva.estacion}</td>
      <td>${formatearFecha(reserva.fecha)}</td>
      <td>${reserva.hora}</td>
      <td>${reserva.productos.join(', ')}</td>
      <td><span class="status-${reserva.estado}">${reserva.estado}</span></td>
      <td>
        ${reserva.estado === 'pendiente' ? 
          `<button class="btn btn-success" onclick="marcarCompletada(${reserva.id})">Completar</button>` : 
          ''
        }
        <button class="btn btn-primary" onclick="verDetalles(${reserva.id})">Ver</button>
        <button class="btn btn-danger" onclick="eliminarReserva(${reserva.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Formatear fecha
function formatearFecha(fecha) {
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Aplicar filtros
function aplicarFiltros() {
  const estacion = document.getElementById('filter-estacion').value;
  const status = document.getElementById('filter-status').value;
  const fecha = document.getElementById('filter-fecha').value;
  
  let reservasFiltradas = reservas;
  
  if (estacion) {
    reservasFiltradas = reservasFiltradas.filter(r => r.estacion === estacion);
  }
  
  if (status) {
    reservasFiltradas = reservasFiltradas.filter(r => r.estado === status);
  }
  
  if (fecha) {
    reservasFiltradas = reservasFiltradas.filter(r => r.fecha === fecha);
  }
  
  renderizarReservas(reservasFiltradas);
}

// Marcar reserva como completada
async function marcarCompletada(id) {
  try {
    const response = await fetch(`/api/reservas?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: 'completada' })
    });
    
    if (response.ok) {
      await cargarReservas();
      actualizarEstadisticas();
      renderizarReservas();
      alert(`Reserva ${id} marcada como completada`);
    } else {
      alert('Error al actualizar la reserva');
    }
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    alert('Error al actualizar la reserva');
  }
}

// Ver detalles de la reserva
function verDetalles(id) {
  const reserva = reservas.find(r => r.id === id);
  if (reserva) {
    const detalles = `
      ID: ${reserva.id}
      Cliente: ${reserva.nombre}
      Teléfono: ${reserva.telefono}
      Estación: ${reserva.estacion}
      Fecha: ${formatearFecha(reserva.fecha)}
      Hora: ${reserva.hora}
      Productos: ${reserva.productos.join(', ')}
      Estado: ${reserva.estado}
      Event ID: ${reserva.eventId}
    `;
    alert(detalles);
  }
}

// Eliminar reserva
async function eliminarReserva(id) {
  if (confirm(`¿Estás seguro de que quieres eliminar la reserva ${id}?`)) {
    try {
      const response = await fetch(`/api/reservas?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await cargarReservas();
        actualizarEstadisticas();
        renderizarReservas();
        alert(`Reserva ${id} eliminada`);
      } else {
        alert('Error al eliminar la reserva');
      }
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      alert('Error al eliminar la reserva');
    }
  }
}

// Exportar a CSV
function exportarReservas() {
  const headers = ['ID', 'Cliente', 'Teléfono', 'Estación', 'Fecha', 'Hora', 'Productos', 'Estado'];
  const csvContent = [
    headers.join(','),
    ...reservas.map(r => [
      r.id,
      `"${r.nombre}"`,
      r.telefono,
      `"${r.estacion}"`,
      r.fecha,
      r.hora,
      `"${r.productos.join(', ')}"`,
      r.estado
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `reservas_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 