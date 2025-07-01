// Variables globales
let reservas = [];
let estaciones = [];
let tabActual = 'todas';
let filtrosActivos = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarReservas();
    cargarEstaciones();
    configurarNavegacion();
});

// Configurar navegación por pestañas
function configurarNavegacion() {
    // Pestañas principales
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            cambiarTab(tabName);
        });
    });

    // Tarjetas de estadísticas
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const tabName = card.getAttribute('data-tab');
            cambiarTab(tabName);
        });
    });
}

// Cambiar pestaña activa
function cambiarTab(tabName) {
    tabActual = tabName;
    
    // Actualizar pestañas
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Actualizar tarjetas de estadísticas
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`.stat-card[data-tab="${tabName}"]`).classList.add('active');
    
    // Mostrar reservas filtradas
    mostrarReservasFiltradas();
}

// Cargar reservas
async function cargarReservas() {
    try {
        const response = await fetch('/api/reservas');
        if (response.ok) {
            reservas = await response.json();
            actualizarEstadisticas();
            mostrarReservasFiltradas();
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
    const estacionesUnicas = [...new Set(estaciones.map(e => e.name))];
    
    estacionesUnicas.forEach(estacion => {
        const option = document.createElement('option');
        option.value = estacion;
        option.textContent = estacion;
        select.appendChild(option);
    });
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const total = reservas.length;
    const pendientes = reservas.filter(r => r.estado === 'pendiente').length;
    const confirmadas = reservas.filter(r => r.estado === 'confirmado').length;
    const canceladas = reservas.filter(r => r.estado === 'cancelada').length;
    
    document.getElementById('total-reservas').textContent = total;
    document.getElementById('reservas-pendientes').textContent = pendientes;
    document.getElementById('reservas-completadas').textContent = confirmadas;
    document.getElementById('reservas-canceladas').textContent = canceladas;
}

// Mostrar reservas filtradas según pestaña y filtros
function mostrarReservasFiltradas() {
    let reservasFiltradas = [...reservas];
    
    // Filtrar por pestaña
    switch(tabActual) {
        case 'pendientes':
            reservasFiltradas = reservasFiltradas.filter(r => r.estado === 'pendiente');
            break;
        case 'completadas':
            reservasFiltradas = reservasFiltradas.filter(r => r.estado === 'confirmado');
            break;
        case 'canceladas':
            reservasFiltradas = reservasFiltradas.filter(r => r.estado === 'cancelada');
            break;
        case 'todas':
        default:
            // No filtrar por estado
            break;
    }
    
    // Aplicar filtros adicionales
    if (filtrosActivos.estacion) {
        reservasFiltradas = reservasFiltradas.filter(r => r.estacion === filtrosActivos.estacion);
    }
    
    if (filtrosActivos.fecha) {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha === filtrosActivos.fecha);
    }
    
    mostrarReservas(reservasFiltradas);
}

// Mostrar reservas
function mostrarReservas(reservasAMostrar) {
    const tbody = document.getElementById('reservas-tbody');
    
    if (reservasAMostrar.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="no-reservas">
                    No hay reservas para mostrar en esta categoría
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    reservasAMostrar.forEach(reserva => {
        const row = document.createElement('tr');
        let estadoTexto = reserva.estado === 'pendiente' ? 'POR CONFIRMAR' : reserva.estado === 'confirmado' ? 'CONFIRMADO' : reserva.estado.toUpperCase();
        row.innerHTML = `
            <td>${reserva.id}</td>
            <td>${reserva.nombre}</td>
            <td>${reserva.telefono}</td>
            <td>${reserva.estacion}</td>
            <td>${formatearFecha(reserva.fecha)}</td>
            <td>${formatearHora(reserva.hora)}</td>
            <td class="productos-list">${formatearProductos(reserva.productos)}</td>
            <td>
                <span class="status-${reserva.estado}">${estadoTexto}</span>
            </td>
            <td>
                ${reserva.calendar_event_id ? '📅' : '❌'}
            </td>
            <td>
                ${getAccionesReserva(reserva)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Obtener botones de acciones según el estado
function getAccionesReserva(reserva) {
    if (reserva.estado === 'pendiente') {
        return `
            <button class="btn btn-success" onclick="cambiarEstado(${reserva.id}, 'confirmado')">✅ Confirmar</button>
            <button class="btn btn-danger" onclick="cancelarReserva(${reserva.id}, '${reserva.calendar_event_id || ''}')">❌ Cancelar</button>
        `;
    } else if (reserva.estado === 'confirmado') {
        return `<button class="btn btn-danger" onclick="cancelarReserva(${reserva.id}, '${reserva.calendar_event_id || ''}')">❌ Cancelar</button>`;
    }
    return '';
}

// Formatear fecha
function formatearFecha(fecha) {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
}

// Formatear hora
function formatearHora(hora) {
    // Si es formato 24h, convertirlo a 12h
    if (/^\d{2}:\d{2}$/.test(hora)) {
        const [h, m] = hora.split(':');
        const horas = parseInt(h);
        const ampm = horas >= 12 ? 'PM' : 'AM';
        const horas12 = horas > 12 ? horas - 12 : horas === 0 ? 12 : horas;
        return `${horas12}:${m} ${ampm}`;
    }
    return hora;
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
    const fecha = document.getElementById('filter-fecha').value;
    
    filtrosActivos = {};
    if (estacion) filtrosActivos.estacion = estacion;
    if (fecha) filtrosActivos.fecha = fecha;
    
    mostrarReservasFiltradas();
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filter-estacion').value = '';
    document.getElementById('filter-fecha').value = '';
    filtrosActivos = {};
    mostrarReservasFiltradas();
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
                mostrarReservasFiltradas();
                // Notificar cambio de estado al frontend principal
                localStorage.setItem('reserva_actualizada', Date.now().toString());
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'reserva_actualizada',
                    newValue: Date.now().toString()
                }));
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
            mostrarReservasFiltradas();
        } else {
            console.error('Error eliminando reserva:', response.status);
        }
    } catch (error) {
        console.error('Error eliminando reserva:', error);
    }
}

// Exportar reservas a CSV
function exportarReservas() {
    const reservasAMostrar = obtenerReservasFiltradas();
    
    if (reservasAMostrar.length === 0) {
        alert('No hay reservas para exportar');
        return;
    }
    
    let csv = 'ID,Nombre,Teléfono,Estación,Fecha,Hora,Productos,Estado,Calendar Event ID\n';
    
    reservasAMostrar.forEach(reserva => {
        const productos = formatearProductos(reserva.productos).replace(/"/g, '""');
        csv += `"${reserva.id}","${reserva.nombre}","${reserva.telefono}","${reserva.estacion}","${reserva.fecha}","${reserva.hora}","${productos}","${reserva.estado}","${reserva.calendar_event_id || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Obtener reservas filtradas para exportación
function obtenerReservasFiltradas() {
    let reservasFiltradas = [...reservas];
    
    // Aplicar filtros activos
    if (filtrosActivos.estacion) {
        reservasFiltradas = reservasFiltradas.filter(r => r.estacion === filtrosActivos.estacion);
    }
    
    if (filtrosActivos.fecha) {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha === filtrosActivos.fecha);
    }
    
    return reservasFiltradas;
}

// --- Overlay de contraseña admin ---
if (!localStorage.getItem('admin_authed')) {
    document.body.innerHTML += `
    <div id="adminOverlay" style="position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:#111;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div style="background:#222;padding:2rem 2.5rem;border-radius:16px;box-shadow:0 4px 32px #0008;display:flex;flex-direction:column;align-items:center;">
            <h2 style="color:#fff;margin-bottom:1.5rem;">Panel de Administración</h2>
            <input id="adminPwdInput" type="password" placeholder="Contraseña de administrador" style="padding:0.8rem 1rem;border-radius:8px;border:none;font-size:1rem;margin-bottom:1rem;width:220px;">
            <button id="adminPwdBtn" style="padding:0.7rem 1.5rem;border-radius:8px;background:#ff6600;color:#fff;font-weight:600;font-size:1rem;border:none;cursor:pointer;">Entrar</button>
            <div id="adminPwdError" style="color:#ff4444;margin-top:1rem;display:none;">Contraseña incorrecta</div>
        </div>
    </div>
    `;
    document.getElementById('adminPwdBtn').onclick = async function() {
        const pwd = document.getElementById('adminPwdInput').value;
        const resp = await fetch('/api/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
        });
        if (resp.ok) {
            localStorage.setItem('admin_authed', '1');
            document.getElementById('adminOverlay').remove();
        } else {
            document.getElementById('adminPwdError').style.display = 'block';
        }
    };
    // Bloquear scroll y tab
    document.body.style.overflow = 'hidden';
}

// Cancelar reserva (elimina de calendar y dashboard)
async function cancelarReserva(id, calendarEventId) {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva? Se eliminará del calendario.')) return;
    try {
        const response = await fetch(`/api/reservas?id=${id}&calendar_event_id=${calendarEventId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await cargarReservas();
            // Notificar al frontend principal que una reserva fue cancelada
            localStorage.setItem('reserva_cancelada', Date.now().toString());
            // Trigger evento personalizado para otras pestañas/ventanas
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'reserva_cancelada',
                newValue: Date.now().toString()
            }));
        } else {
            console.error('Error cancelando reserva:', response.status);
        }
    } catch (error) {
        console.error('Error cancelando reserva:', error);
    }
} 