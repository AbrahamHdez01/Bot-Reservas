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
    actualizarCarrito();
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
        mostrarProductosPorCategoria();
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error cargando productos');
    }
}

// Mostrar productos agrupados por categoría
function mostrarProductosPorCategoria() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    for (const categoria in productos) {
        if (!productos.hasOwnProperty(categoria)) continue;
        const categoriaDiv = document.createElement('div');
        categoriaDiv.className = 'categoria-productos';
        categoriaDiv.innerHTML = `<h3 style="margin-bottom: 0.5rem; color: var(--primary-color); text-transform: capitalize;">${categoria.replace('_', ' ')}</h3>`;

        productos[categoria].forEach(producto => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-info">
                    <h4 style="margin-bottom: 0.5rem;">${producto.nombre}</h4>
                    <div class="product-price">$${producto.precio}</div>
                    <div class="product-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cambiarCantidad('${producto.id}', -1)">-</button>
                            <span class="quantity-display" id="qty-${producto.id}">0</span>
                            <button class="quantity-btn" onclick="cambiarCantidad('${producto.id}', 1)">+</button>
                        </div>
                        <button class="add-to-cart-btn" onclick="agregarAlCarrito('${producto.id}')">
                            Agregar
                        </button>
                    </div>
                </div>
            `;
            categoriaDiv.appendChild(productCard);
        });
        productsGrid.appendChild(categoriaDiv);
    }
}

// Cambiar cantidad de producto
function cambiarCantidad(productoId, cambio) {
    const display = document.getElementById(`qty-${productoId}`);
    let cantidad = parseInt(display.textContent) + cambio;
    cantidad = Math.max(0, cantidad);
    display.textContent = cantidad;
}

// Agregar al carrito
function agregarAlCarrito(productoId) {
    let producto = null;
    for (const categoria in productos) {
        if (!productos.hasOwnProperty(categoria)) continue;
        producto = productos[categoria].find(p => p.id === productoId);
        if (producto) break;
    }
    if (!producto) return;

    const cantidad = parseInt(document.getElementById(`qty-${productoId}`).textContent);
    if (cantidad === 0) {
        mostrarError('Selecciona una cantidad mayor a 0');
        return;
    }

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

    // Resetear cantidad
    document.getElementById(`qty-${productoId}`).textContent = '0';
    
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

    // Cambiar a la pestaña de reserva
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

    // Configurar fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;

    // Configurar horas disponibles
    llenarHorasDisponibles();

    // Evento de cambio de fecha
    fechaInput.addEventListener('change', llenarHorasDisponibles);

    // Evento de envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearReserva();
    });
}

// Llenar horas disponibles
function llenarHorasDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const estacionSelect = document.getElementById('estacion');
    
    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    if (!fechaInput.value || !estacionSelect.value) return;

    const estacion = estacionSelect.value.toLowerCase();
    let horaInicio = 10; // Por defecto 10 am
    let horaFin = 17; // 5 pm
    
    // Ajustar hora de inicio según estación
    if (["constitución", "chabacano", "la viga", "santa anita"].some(n => estacion.includes(n))) {
        // Línea 8: Constitución a Santa Anita (desde 8:30 am)
        horaInicio = 8.5; // 8:30 am
    } else if (["periférico oriente", "atlalilco"].some(n => estacion.includes(n))) {
        // Periférico Oriente a Atlalilco (desde 8:30 am)
        horaInicio = 8.5; // 8:30 am
    } else if (["mixcoac", "polanco"].some(n => estacion.includes(n))) {
        // Mixcoac a Polanco (desde 8:30 am)
        horaInicio = 8.5; // 8:30 am
    }
    // Otras estaciones mantienen 10 am a 5 pm

    // Generar opciones de hora
    for (let hora = horaInicio; hora <= horaFin; hora += 0.5) {
        const horaFormateada = formatearHora(hora);
        const option = document.createElement('option');
        option.value = horaFormateada;
        option.textContent = horaFormateada;
        horaSelect.appendChild(option);
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

// Crear reserva
async function crearReserva() {
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
        hora: formData.get('hora'),
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

    try {
        // Crear evento en Google Calendar
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

        let eventId = null;
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            eventId = calendarData.eventId;
        }

        // Crear reserva
        const reservaResponse = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...datos,
                eventId: eventId
            })
        });

        if (reservaResponse.ok) {
            const reserva = await reservaResponse.json();
            mostrarConfirmacion(reserva.id);
            
            // Limpiar carrito y formulario
            carrito = [];
            actualizarCarrito();
            document.getElementById('reservationForm').reset();
            
            // Volver a la pestaña de productos
            document.querySelector('[data-tab="products"]').click();
        } else {
            const error = await reservaResponse.json();
            mostrarError(error.error || 'Error creando la reserva');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión. Intenta de nuevo.');
    }
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