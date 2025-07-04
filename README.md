# Bot Citas Metro CDMX

Este proyecto es un sistema de reservas para entregas de productos en estaciones del Metro de la Ciudad de México. Permite a los usuarios seleccionar productos (perfumes, body mist, bolsas, complementos y libros personalizados), elegir estación, fecha y hora para la entrega, y gestionar el proceso de reservas de manera eficiente y visual.

## 🚀 Características principales

- **Selección de productos por categoría** (perfumes, body mist, bolsas, complementos, libros personalizados)
- **Carrito de compras**: agrega, elimina y ajusta cantidades antes de reservar
- **Reserva de horario y estación**: elige estación de metro, fecha y hora disponible
- **Validación inteligente**: evita reservas en horarios ocupados y valida entradas en tiempo real
- **Sistema de cálculo de tiempos realista**: calcula tiempos de traslado entre estaciones usando geolocalización y lógica propia (sin depender de Google Maps)
- **Panel de administración**: para gestionar y visualizar reservas
- **Interfaz moderna y responsiva**

## 🗂️ Estructura de archivos relevante

- `public/index.html` — Interfaz principal para usuarios
- `public/script.js` — Lógica de frontend (manejo de productos, carrito, reservas, validaciones)
- `public/productos.json` — Catálogo de productos y categorías
- `public/style.css` — Estilos visuales
- `api/` — Lógica backend para validación, reservas y cálculo de tiempos
- `lib/` — Utilidades para geolocalización, autenticación y lógica de negocio

## 🛠️ ¿Cómo funciona?

1. El usuario entra a la web y selecciona productos por categoría.
2. Puede agregar productos al carrito, incluyendo libros personalizados (con validación de título en tiempo real).
3. Elige estación, fecha y hora para la entrega (solo horarios disponibles).
4. Confirma la reserva, la cual queda registrada y visible en el panel de administración.
5. El sistema calcula automáticamente los tiempos de traslado y evita solapamientos.

## 👨‍💻 Personalización y contacto

¿Quieres adaptar este sistema a tu propio negocio, agregar nuevas categorías, cambiar la lógica de reservas o personalizar la interfaz?

**Contáctame:**

📧 abrahammartinezhdez629@gmail.com

Puedo ayudarte a modificar el sistema según tus necesidades, agregar nuevas funcionalidades o integrarlo con otros servicios.

---

¡Gracias por usar este sistema de reservas Metro CDMX! Si tienes dudas, sugerencias o quieres una versión personalizada, no dudes en escribir. 