// Variables globales
let cart = [];
let estaciones = [];
let productos = {};

// Cargar estaciones y productos
async function cargarDatos() {
  try {
    const metroStations = await fetch('/metro_stations.json').then(r => r.json());
    const productosData = await fetch('/productos.json').then(r => r.json());
    
    // Filtrar solo estaciones disponibles y aplanar la estructura
    estaciones = [];
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
    
    productos = productosData;
    return { estaciones, productos };
  } catch (error) {
    console.error('Error cargando datos:', error);
    showMessage('Error cargando los datos. Por favor recarga la página.', 'error');
  }
}

// Renderizar estaciones
function renderEstaciones() {
  const select = document.getElementById('estacion');
  select.innerHTML = '<option value="">Selecciona una estación</option>';
  estaciones.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.nombre;
    opt.textContent = `${e.nombre} (Línea ${e.linea})`;
    select.appendChild(opt);
  });
}

// Renderizar productos como tarjetas
function renderProductos() {
  const cont = document.getElementById('productos');
  cont.innerHTML = '';
  
  Object.entries(productos).forEach(([cat, items]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'product-category';
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.textContent = cat.replace('_', ' ').toUpperCase();
    categoryTitle.style.gridColumn = '1 / -1';
    categoryTitle.style.color = 'var(--primary-color)';
    categoryTitle.style.marginTop = '20px';
    categoryTitle.style.marginBottom = '15px';
    categoryTitle.style.borderBottom = '2px solid var(--primary-color)';
    categoryTitle.style.paddingBottom = '10px';
    cont.appendChild(categoryTitle);
    
    items.forEach(prod => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <h3>${prod}</h3>
        <p>Categoría: ${cat.replace('_', ' ')}</p>
        <button class="add-to-cart-btn" onclick="addToCart('${prod}', '${cat}')">
          <i class="fas fa-plus"></i> Agregar al Carrito
        </button>
      `;
      cont.appendChild(productCard);
    });
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

// Funciones del carrito
function addToCart(producto, categoria) {
  const existingItem = cart.find(item => item.producto === producto);
  
  if (existingItem) {
    existingItem.cantidad += 1;
  } else {
    cart.push({
      producto,
      categoria,
      cantidad: 1
    });
  }
  
  updateCartDisplay();
  showMessage(`${producto} agregado al carrito`, 'success');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartDisplay();
}

function updateQuantity(index, change) {
  cart[index].cantidad += change;
  
  if (cart[index].cantidad <= 0) {
    removeFromCart(index);
  } else {
    updateCartDisplay();
  }
}

function updateCartDisplay() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  // Actualizar contador
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  cartCount.textContent = totalItems;
  
  // Actualizar items del carrito
  cartItems.innerHTML = '';
  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.producto}</h4>
        <p>${item.categoria.replace('_', ' ')}</p>
      </div>
      <div class="cart-item-actions">
        <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
        <span>${item.cantidad}</span>
        <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
        <button class="remove-btn" onclick="removeFromCart(${index})">Eliminar</button>
      </div>
    `;
    cartItems.appendChild(cartItem);
  });
  
  // Actualizar total
  cartTotal.textContent = totalItems;
}

function toggleCart() {
  const cartSidebar = document.getElementById('cart-sidebar');
  cartSidebar.classList.toggle('open');
}

function proceedToCheckout() {
  if (cart.length === 0) {
    showMessage('Agrega productos al carrito primero', 'error');
    return;
  }
  
  document.querySelector('.products-section').style.display = 'none';
  document.getElementById('checkout-section').style.display = 'block';
  
  // Mostrar productos seleccionados
  const selectedProductsList = document.getElementById('selected-products-list');
  selectedProductsList.innerHTML = '';
  
  cart.forEach(item => {
    const productDiv = document.createElement('div');
    productDiv.className = 'selected-product';
    productDiv.innerHTML = `
      <span>${item.producto} (${item.categoria.replace('_', ' ')})</span>
      <span>Cantidad: ${item.cantidad}</span>
    `;
    selectedProductsList.appendChild(productDiv);
  });
  
  toggleCart();
}

function showMessage(message, type = 'success') {
  const resultado = document.getElementById('resultado');
  resultado.innerHTML = `<div class="result-message ${type}">${message}</div>`;
  
  setTimeout(() => {
    resultado.innerHTML = '';
  }, 5000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();
  renderEstaciones();
  renderProductos();

  document.getElementById('reserva-form').onsubmit = async e => {
    e.preventDefault();
    
    if (cart.length === 0) {
      showMessage('Agrega productos al carrito primero', 'error');
      return;
    }
    
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const estacion = document.getElementById('estacion').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    if (!nombre || !telefono || !estacion || !fecha || !hora) {
      showMessage('Completa todos los campos', 'error');
      return;
    }
    
    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) {
      showMessage(errorTelefono, 'error');
      return;
    }
    
    const error = validarFechaHora(fecha, hora);
    if (error) {
      showMessage(error, 'error');
      return;
    }

    // Preparar productos para la API
    const productosSel = cart.map(item => `${item.producto} (x${item.cantidad})`);

    // Calcular ETA
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
        const errorData = await reservaGuardada.json();
        throw new Error(errorData.error || 'Error guardando la reserva');
      }
      
      const reservaData = await reservaGuardada.json();
      
      showMessage(`
        <h3>¡Reserva creada exitosamente!</h3>
        <p><strong>Cliente:</strong> ${nombre}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Estación:</strong> ${estacion}</p>
        <p><strong>Fecha:</strong> ${fecha} a las ${hora}</p>
        <p><strong>Productos:</strong> ${productosSel.join(', ')}</p>
        <p><strong>Duración estimada:</strong> ${eta.minutos + 10} minutos</p>
        <p><a href="${resultado.eventLink}" target="_blank">Ver evento en Google Calendar</a></p>
      `, 'success');
      
      // Limpiar carrito y formulario
      cart = [];
      updateCartDisplay();
      e.target.reset();
      
      // Volver a la sección de productos
      document.querySelector('.products-section').style.display = 'block';
      document.getElementById('checkout-section').style.display = 'none';
      
    } catch (error) {
      console.error('Error completo:', error);
      showMessage(`Error al crear la reserva: ${error.message}`, 'error');
    }
  };
}); 