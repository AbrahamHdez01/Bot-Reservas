// Variables globales
let productos = {};
let carrito = [];
let estaciones = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    cargarEstaciones();
    configurarNavegacion();
    configurarFormulario();
    configurarSelectorProductos();
    actualizarCarrito();
    
    // Escuchar cambios de reservas desde el panel de admin
    window.addEventListener('storage', function(e) {
        if (e.key === 'reserva_cancelada' || e.key === 'reserva_actualizada') {
            // Recargar horas disponibles si estamos en la pestaña de reserva
            const fechaInput = document.getElementById('fecha');
            const estacionSelect = document.getElementById('estacion');
            if (fechaInput && estacionSelect && fechaInput.value && estacionSelect.value) {
                llenarHorasDisponibles();
            }
        }
    });
    
    // También escuchar en la misma pestaña (por si admin y frontend están en la misma ventana)
    window.addEventListener('reserva_cancelada', function() {
        const fechaInput = document.getElementById('fecha');
        const estacionSelect = document.getElementById('estacion');
        if (fechaInput && estacionSelect && fechaInput.value && estacionSelect.value) {
            llenarHorasDisponibles();
        }
    });
});

// Navegación por pestañas
function configurarNavegacion() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Agregar clase active al botón clickeado y su contenido
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Cargar productos
async function cargarProductos() {
    try {
        const response = await fetch('/productos.json');
        productos = await response.json();
        llenarSelectorCategorias();
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error cargando productos');
    }
}

// Llenar selector de categorías
function llenarSelectorCategorias() {
    const categoriaSelect = document.getElementById('categoriaSelect');
    categoriaSelect.innerHTML = '<option value="">Selecciona una categoría</option>';
    for (const categoria in productos) {
        if (!productos.hasOwnProperty(categoria)) continue;
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria.replace('_', ' ').toUpperCase();
        categoriaSelect.appendChild(option);
    }
}

// Llenar selector de productos según categoría
function llenarSelectorProductos() {
    const categoria = document.getElementById('categoriaSelect').value;
    const productoSelect = document.getElementById('productoSelect');
    productoSelect.innerHTML = '<option value="">Selecciona un producto</option>';
    if (!categoria || !productos[categoria]) return;
    productos[categoria].forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.nombre} ($${producto.precio})`;
        productoSelect.appendChild(option);
    });
}

// Configurar lógica de selección de productos
function configurarSelectorProductos() {
    const categoriaSelect = document.getElementById('categoriaSelect');
    const productoSelect = document.getElementById('productoSelect');
    const addProductForm = document.getElementById('addProductForm');

    categoriaSelect.addEventListener('change', llenarSelectorProductos);
    addProductForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const categoria = categoriaSelect.value;
        const productoId = productoSelect.value;
        if (!categoria || !productoId) return;
        agregarAlCarrito(productoId, 1);
        // Resetear selección de producto
        productoSelect.value = '';
    });
}

// Agregar al carrito (cantidad opcional, por defecto 1)
function agregarAlCarrito(productoId, cantidad = 1) {
    let producto = null;
    for (const categoria in productos) {
        if (!productos.hasOwnProperty(categoria)) continue;
        producto = productos[categoria].find(p => p.id === productoId);
        if (producto) break;
    }
    if (!producto) return;

    const itemExistente = carrito.find(item => item.id === productoId);
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: cantidad
        });
    }
    actualizarCarrito();
    mostrarExito('Producto agregado al carrito');
}

// Actualizar carrito
function actualizarCarrito() {
    const cartItems = document.getElementById('cartItems');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotal = document.getElementById('cartTotal');

    // Actualizar badge
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartBadge.textContent = totalItems;

    // Actualizar items del carrito
    cartItems.innerHTML = '';
    if (carrito.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay productos en el carrito</p>';
        cartTotal.textContent = '0';
        return;
    }

    carrito.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-header">
                <div class="cart-item-title">${item.nombre}</div>
                <div class="cart-item-price">$${item.precio}</div>
            </div>
            <div class="cart-item-controls">
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="cambiarCantidadCarrito('${item.id}', -1)">-</button>
                    <span class="quantity-display">${item.cantidad}</span>
                    <button class="quantity-btn" onclick="cambiarCantidadCarrito('${item.id}', 1)">+</button>
                </div>
                <button class="remove-item-btn" onclick="removerDelCarrito('${item.id}')">Eliminar</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });

    // Actualizar total
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    cartTotal.textContent = total;
}

// Cambiar cantidad en carrito
function cambiarCantidadCarrito(productoId, cambio) {
    const item = carrito.find(item => item.id === productoId);
    if (item) {
        item.cantidad += cambio;
        if (item.cantidad <= 0) {
            removerDelCarrito(productoId);
        } else {
            actualizarCarrito();
        }
    }
}

// Remover del carrito
function removerDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    actualizarCarrito();
}

// Ir a la pestaña de reserva
function goToReservation() {
    if (carrito.length === 0) {
        mostrarError('Agrega productos al carrito primero');
        return;
    }
    document.querySelector('[data-tab="reservation"]').click();
}

// Cargar estaciones
async function cargarEstaciones() {
    try {
        const response = await fetch('/metro_stations.json');
        const data = await response.json();
        
        // Filtrar estaciones según las reglas de negocio
        estaciones = data.filter(estacion => estacion.available);
        llenarSelectEstaciones();
    } catch (error) {
        console.error('Error cargando estaciones:', error);
        mostrarError('Error cargando estaciones');
    }
}

// Llenar select de estaciones
function llenarSelectEstaciones() {
    const select = document.getElementById('estacion');
    select.innerHTML = '<option value="">Selecciona una estación</option>';
    
    estaciones.forEach(estacion => {
        const option = document.createElement('option');
        option.value = estacion.name;
        option.textContent = estacion.name;
        select.appendChild(option);
    });
}

// Configurar formulario
function configurarFormulario() {
    const form = document.getElementById('reservationForm');
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const estacionSelect = document.getElementById('estacion');

    // Configurar fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;

    // Configurar horas disponibles
    llenarHorasDisponibles();

    // Evento de cambio de fecha
    fechaInput.addEventListener('change', llenarHorasDisponibles);
    
    // Evento de cambio de estación
    estacionSelect.addEventListener('change', llenarHorasDisponibles);

    // Evento de envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearReserva();
    });
}

// Llenar horas disponibles
async function llenarHorasDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const estacionSelect = document.getElementById('estacion');
    
    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    if (!fechaInput.value || !estacionSelect.value) return;

    // Validar que sea lunes a viernes (bloquear sábado y domingo, usando UTC)
    const fecha = new Date(fechaInput.value);
    const diaSemana = fecha.getUTCDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    if (diaSemana === 0 || diaSemana === 6) {
        horaSelect.innerHTML = '<option value="">Solo se permiten reservas de lunes a viernes</option>';
        return;
    }

    const estacion = estacionSelect.value;
    let horaInicio = 10; // Por defecto 10 am
    let horaFin = 17; // 5 pm
    
    // Ajustar hora de inicio según estación específica
    if (["constitución", "chabacano", "la viga", "santa anita"].some(n => estacion.toLowerCase().includes(n))) {
        horaInicio = 8.5; // 8:30 am
    } else if (["periférico oriente", "atlalilco"].some(n => estacion.toLowerCase().includes(n))) {
        horaInicio = 8.5; // 8:30 am
    } else if (["mixcoac", "polanco"].some(n => estacion.toLowerCase().includes(n))) {
        horaInicio = 8.5; // 8:30 am
    }

    // Consultar reservas ocupadas para la fecha (TODAS las estaciones, no solo la seleccionada)
    let horasOcupadas = [];
    try {
        const resp = await fetch(`/api/reservas?fecha=${fechaInput.value}`);
        if (resp.ok) {
            const reservasFecha = await resp.json();
            // Filtrar solo reservas activas (pendiente y confirmado)
            const reservasActivas = reservasFecha.filter(r => r.estado === 'pendiente' || r.estado === 'confirmado');
            horasOcupadas = reservasActivas.map(r => to24Hour(r.hora));
        }
    } catch (e) {
        // Si falla, no bloquea ninguna hora
    }

    // Generar opciones de hora solo en intervalos de 30 minutos
    for (let hora = horaInicio; hora <= horaFin; hora += 0.5) {
        const minutos = (hora % 1) * 60;
        if (minutos !== 0 && minutos !== 30) continue; // Solo :00 y :30
        const horaFormateada = formatearHora(hora);
        const hora24 = to24Hour(horaFormateada);
        if (!horasOcupadas.includes(hora24)) {
            const option = document.createElement('option');
            option.value = horaFormateada;
            option.textContent = horaFormateada;
            horaSelect.appendChild(option);
        }
    }
}

// Formatear hora
function formatearHora(hora) {
    const horas = Math.floor(hora);
    const minutos = (hora % 1) * 60;
    const ampm = horas >= 12 ? 'PM' : 'AM';
    const horas12 = horas > 12 ? horas - 12 : horas === 0 ? 12 : horas;
    return `${horas12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
}

// Convierte hora de 12h a 24h
function to24Hour(hora) {
  // Si ya es formato 24h, normalizar a HH:MM
  const match24 = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    let m = match24[2];
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  // Si es formato 12h con AM/PM
  const match = hora.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return hora;
  let [_, h, m, ampm] = match;
  h = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m}`;
}

// Crear reserva
async function crearReserva(horaForzada = null) {
    if (carrito.length === 0) {
        mostrarError('Agrega productos al carrito primero');
        return;
    }

    const formData = new FormData(document.getElementById('reservationForm'));
    const datos = {
        nombre: formData.get('nombre'),
        telefono: formData.get('telefono'),
        estacion: formData.get('estacion'),
        fecha: formData.get('fecha'),
        hora: horaForzada || to24Hour(formData.get('hora')),
        productos: carrito
    };

    // Validaciones
    if (!datos.nombre || !datos.telefono || !datos.estacion || !datos.fecha || !datos.hora) {
        mostrarError('Todos los campos son requeridos');
        return;
    }

    if (!/^\d{10}$/.test(datos.telefono)) {
        mostrarError('El teléfono debe tener 10 dígitos');
        return;
    }

    // Validar fecha (no permitir fechas pasadas)
    const fechaSeleccionada = new Date(datos.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaSeleccionada < hoy) {
        mostrarError('No puedes seleccionar una fecha pasada');
        return;
    }

    // Validar que sea lunes a viernes (bloquear sábado y domingo, usando UTC)
    const diaSemana = fechaSeleccionada.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
        mostrarError('Solo se permiten reservas de lunes a viernes');
        return;
    }

    // Validar horario según estación
    const estacion = datos.estacion.toLowerCase();
    const horaSeleccionada = datos.hora; // Ya está en formato 24h
    let horaInicio = 10;
    let horaFin = 17;
    
    // Ajustar hora de inicio según estación específica
    if (["constitución", "chabacano", "la viga", "santa anita"].some(n => estacion.includes(n))) {
        horaInicio = 8.5;
    } else if (["periférico oriente", "atlalilco"].some(n => estacion.includes(n))) {
        horaInicio = 8.5;
    } else if (["mixcoac", "polanco"].some(n => estacion.includes(n))) {
        horaInicio = 8.5;
    }

    // Convertir hora seleccionada a formato numérico para validación
    const horaNum = parseHoraToNumero(horaSeleccionada);
    if (horaNum < horaInicio || horaNum > horaFin) {
        mostrarError(`Para la estación ${datos.estacion}, los horarios disponibles son de ${formatearHora(horaInicio)} a ${formatearHora(horaFin)}`);
        return;
    }

    // --- Validación de conflicto con backend ---
    if (!horaForzada) {
        try {
            const validarResp = await fetch('/api/validar-reserva', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: datos.fecha,
                    horaDeseada: datos.hora,
                    estacionDeseada: datos.estacion
                })
            });
            const validarData = await validarResp.json();
            if (!validarData.disponible) {
                if (validarData.horaSugerida) {
                    if (confirm(`${validarData.mensaje}\n¿Quieres reservar a las ${validarData.horaSugerida}?`)) {
                        // Reintentar con la hora sugerida
                        return crearReserva(validarData.horaSugerida);
                    } else {
                        mostrarError('Por favor elige otra hora.');
                        return;
                    }
                } else {
                    mostrarError(validarData.motivo || 'No hay horarios disponibles.');
                    return;
                }
            }
        } catch (e) {
            mostrarError('No se pudo validar la disponibilidad. Intenta de nuevo.');
            return;
        }
    }

    try {
        console.log('🚀 Iniciando proceso de reserva...');
        console.log('📋 Datos a enviar:', datos);
        
        // Crear evento en Google Calendar y guardar en base de datos
        console.log('📅 Llamando a /api/calendar...');
        const calendarResponse = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: datos.nombre,
                telefono: datos.telefono,
                estacion: datos.estacion,
                fecha: datos.fecha,
                hora: datos.hora,
                productos: carrito
            })
        });

        console.log('📅 Respuesta de calendar:', calendarResponse.status, calendarResponse.statusText);
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            console.log('✅ Reserva creada exitosamente:', calendarData);
            mostrarConfirmacion(calendarData.reservaId || calendarData.eventId);
            
            // Limpiar carrito y formulario
            carrito = [];
            actualizarCarrito();
            document.getElementById('reservationForm').reset();
            
            // Volver a la pestaña de productos
            document.querySelector('[data-tab="products"]').click();
        } else {
            const errorData = await calendarResponse.json();
            console.error('❌ Error en la reserva:', errorData);
            mostrarError(errorData.error || 'Error creando la reserva');
        }
    } catch (error) {
        console.error('❌ Error general:', error);
        mostrarError('Error de conexión. Intenta de nuevo.');
    }

    const btn = document.getElementById('confirmarReservaBtn');
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar Reserva';
    }
}

// Convertir hora formateada a número para validación
function parseHoraToNumero(horaFormateada) {
    // Si es formato 24h (HH:MM)
    const match24h = horaFormateada.match(/^(\d{1,2}):(\d{2})$/);
    if (match24h) {
        const horas = parseInt(match24h[1]);
        const minutos = parseInt(match24h[2]);
        return horas + (minutos / 60);
    }
    
    // Si es formato 12h (h:mm AM/PM)
    const match12h = horaFormateada.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12h) {
        let horas = parseInt(match12h[1]);
        const minutos = parseInt(match12h[2]);
        const ampm = match12h[3].toUpperCase();
        
        if (ampm === 'PM' && horas !== 12) {
            horas += 12;
        } else if (ampm === 'AM' && horas === 12) {
            horas = 0;
        }
        
        return horas + (minutos / 60);
    }
    
    // Si no coincide con ningún formato, retornar 0
    console.warn('Formato de hora no reconocido:', horaFormateada);
    return 0;
}

// Mostrar confirmación
function mostrarConfirmacion(reservaId) {
    document.getElementById('reservationId').textContent = reservaId;
    document.getElementById('confirmationModal').classList.add('active');
}

// Mostrar error
function mostrarError(mensaje) {
    document.getElementById('errorMessage').textContent = mensaje;
    document.getElementById('errorModal').classList.add('active');
}

// Mostrar éxito
function mostrarExito(mensaje) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'status-message status-success';
    notification.textContent = mensaje;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '2000';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Cerrar modal
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
}); 