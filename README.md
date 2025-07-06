# Bot Citas Metro CDMX

Este proyecto es un sistema de reservas en **tiempo real** para entregas de productos en estaciones del Metro de la Ciudad de México. Utiliza la API de Google Maps para cálculos de rutas y la API de Google Calendar para reflejar automáticamente cada reserva en tu calendario, asegurando máxima organización y eficiencia.

## 🚀 Características principales

- **Reservas en tiempo real:** disponibilidad y horarios siempre actualizados, sin dobles reservas
- **Integración con Google Calendar:** cada cita se agenda automáticamente en tu Google Calendar, ¡no se te pasa ninguna!
- **Cálculo inteligente de rutas:** usa la API de Google Maps y lógica propia para estimar tiempos de traslado entre estaciones, para asegurarnos de esto se integraron las coordenadas exactas de cada estación del metro para tener una mayor precision de traslados
- **Selección de productos por categoría** (perfumes, libros, bolsas, etc)
- **Carrito de compras**: agrega, elimina y ajusta cantidades antes de reservar
- **Validación inteligente**: evita reservas en horarios ocupados y valida entradas en tiempo real
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
3. Elige estación, fecha y hora para la entrega (solo horarios disponibles y sin solapamientos).
4. Confirma la reserva, la cual queda registrada y **se refleja automáticamente en Google Calendar**.
5. El sistema calcula automáticamente los tiempos de traslado usando la API de Google Maps y lógica propia, evitando solapamientos y optimizando la agenda.

## 🌟 ¿Por qué elegir este sistema?

- **Automatización total:** Olvídate de agendar manualmente, todo queda en tu Google Calendar.
- **Evita errores humanos:** El sistema bloquea horarios ocupados y calcula rutas realistas.
- **Escalable y personalizable:** Puedes agregar más productos, categorías o estaciones fácilmente.
- **Ideal para negocios móviles, ventas en el metro, o cualquier servicio con entregas programadas.**

## 👨‍💻 Personalización y contacto

¿Quieres adaptar este sistema a tu propio negocio, agregar nuevas categorías, cambiar la lógica de reservas o personalizar la interfaz?

**Contáctame:**

📧 abrahammartinezhdez629@gmail.com

Puedo ayudarte a modificar el sistema según tus necesidades, agregar nuevas funcionalidades o integrarlo con otros servicios.

---

¡Gracias por usar este sistema de reservas Metro CDMX! Si tienes dudas, sugerencias o quieres una versión personalizada, no dudes en escribir. 

