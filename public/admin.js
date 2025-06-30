// Variables globales
let reservas = [];
let estaciones = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarReservas();
    cargarEstaciones();
});

// Cargar reservas
async function cargarReservas() {
    try {
        const response = await fetch('/api/reservas');
        if (response.ok) {
            reservas = await response.json();
            actualizarEstadisticas();
            mostrarReservas();
        } else {
            console.error('Error cargando reservas:', response.status);
        }
    } catch (error) {
        console.error('Error cargando reservas:', error);
    }
}

// Cargar estaciones para filtros
async function cargarEstaciones() {
    try {
        const response = await fetch('/metro_stations.json');
        const data = await response.json();
        estaciones = data;
        llenarFiltroEstaciones();
    } catch (error) {
        console.error('Error cargando estaciones:', error);
    }
}

// Llenar filtro de estaciones
function llenarFiltroEstaciones() {
    const select = document.getElementById('filter-estacion');
    const estacionesUnicas = [...new Set(estaciones.map(e => e.nombre))];
    
    estacionesUnicas.forEach(estacion => {
        const option = document.createElement('option');
        option.value = estacion;
        option.textContent = estacion;
        select.appendChild(option);
    });
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const hoy = new Date().toISOString().split('T')[0];
    
    const total = reservas.length;
    const hoyCount = reservas.filter(r => r.fecha === hoy).length;
    const pendientes = reservas.filter(r => r.estado === 'pendiente').length;
    const completadas = reservas.filter(r => r.estado === 'completada').length;
    
    document.getElementById('total-reservas').textContent = total;
    document.getElementById('reservas-hoy').textContent = hoyCount;
    document.getElementById('reservas-pendientes').textContent = pendientes;
    document.getElementById('reservas-completadas').textContent = completadas;
}

// Mostrar reservas
function mostrarReservas(reservasFiltradas = null) {
    const tbody = document.getElementById('reservas-tbody');
    const reservasAMostrar = reservasFiltradas || reservas;
    
    if (reservasAMostrar.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-reservas">
                    No hay reservas para mostrar
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    reservasAMostrar.forEach(reserva => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reserva.id}</td>
            <td>${reserva.nombre}</td>
            <td>${reserva.telefono}</td>
            <td>${reserva.estacion}</td>
            <td>${formatearFecha(reserva.fecha)}</td>
            <td>${reserva.hora}</td>
            <td class="productos-list">${formatearProductos(reserva.productos)}</td>
            <td>
                <span class="status-${reserva.estado}">${reserva.estado}</span>
            </td>
            <td>
                ${reserva.estado === 'pendiente' ? 
                    `<button class="btn btn-success" onclick="cambiarEstado(${reserva.id}, 'completada')">✅ Completar</button>` : 
                    `<button class="btn btn-primary" onclick="cambiarEstado(${reserva.id}, 'pendiente')">⏳ Pendiente</button>`
                }
                <button class="btn btn-danger" onclick="eliminarReserva(${reserva.id})">🗑️ Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Formatear fecha
function formatearFecha(fecha) {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
}

// Formatear productos
function formatearProductos(productos) {
    if (!productos || !Array.isArray(productos)) return 'N/A';
    
    return productos.map(p => {
        if (typeof p === 'string') {
            return p;
        } else if (p.nombre && p.cantidad) {
            return `${p.nombre} (x${p.cantidad})`;
        } else {
            return 'Producto';
        }
    }).join(', ');
}

// Aplicar filtros
function aplicarFiltros() {
    const estacion = document.getElementById('filter-estacion').value;
    const estado = document.getElementById('filter-status').value;
    const fecha = document.getElementById('filter-fecha').value;
    
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
    
    mostrarReservas(reservasFiltradas);
}

// Cambiar estado de reserva
async function cambiarEstado(id, nuevoEstado) {
    try {
        const response = await fetch(`/api/reservas?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response.ok) {
            // Actualizar la reserva local
            const reserva = reservas.find(r => r.id === id);
            if (reserva) {
                reserva.estado = nuevoEstado;
                actualizarEstadisticas();
                mostrarReservas();
            }
        } else {
            console.error('Error cambiando estado:', response.status);
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
    }
}

// Eliminar reserva
async function eliminarReserva(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reserva?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/reservas?id=${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Remover la reserva local
            reservas = reservas.filter(r => r.id !== id);
            actualizarEstadisticas();
            mostrarReservas();
        } else {
            console.error('Error eliminando reserva:', response.status);
        }
    } catch (error) {
        console.error('Error eliminando reserva:', error);
    }
}

// Exportar reservas a CSV
function exportarReservas() {
    const headers = ['ID', 'Cliente', 'Teléfono', 'Estación', 'Fecha', 'Hora', 'Productos', 'Estado', 'Fecha Creación'];
    const csvContent = [
        headers.join(','),
        ...reservas.map(r => [
            r.id,
            `"${r.nombre}"`,
            r.telefono,
            `"${r.estacion}"`,
            r.fecha,
            r.hora,
            `"${formatearProductos(r.productos)}"`,
            r.estado,
            r.fechaCreacion || ''
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

// Recargar datos cada 30 segundos
setInterval(cargarReservas, 30000); 