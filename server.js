const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'client/build')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      products TEXT NOT NULL,
      metro_station TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      google_calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Metro stations table
    db.run(`CREATE TABLE IF NOT EXISTS metro_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      line TEXT NOT NULL,
      latitude REAL,
      longitude REAL
    )`);

    // Insert default Metro CDMX stations
    const stations = [
      // Línea 1
      { name: 'Observatorio', line: '1', lat: 19.3975, lng: -99.2008 },
      { name: 'Tacubaya', line: '1', lat: 19.4025, lng: -99.1875 },
      { name: 'Juanacatlán', line: '1', lat: 19.4075, lng: -99.1750 },
      { name: 'Chapultepec', line: '1', lat: 19.4125, lng: -99.1875 },
      { name: 'Sevilla', line: '1', lat: 19.4175, lng: -99.1750 },
      { name: 'Insurgentes Sur', line: '1', lat: 19.4225, lng: -99.1625 },
      { name: 'Cuauhtémoc', line: '1', lat: 19.4275, lng: -99.1500 },
      { name: 'Balderas', line: '1', lat: 19.4325, lng: -99.1375 },
      { name: 'Salto del Agua', line: '1', lat: 19.4375, lng: -99.1250 },
      { name: 'Isabel la Católica', line: '1', lat: 19.4425, lng: -99.1125 },
      { name: 'Pino Suárez', line: '1', lat: 19.4475, lng: -99.1000 },
      { name: 'Merced', line: '1', lat: 19.4525, lng: -99.0875 },
      { name: 'Candelaria', line: '1', lat: 19.4575, lng: -99.0750 },
      { name: 'San Lázaro', line: '1', lat: 19.4625, lng: -99.0625 },
      { name: 'Moctezuma', line: '1', lat: 19.4675, lng: -99.0500 },
      { name: 'Balbuena', line: '1', lat: 19.4725, lng: -99.0375 },
      { name: 'Boulevard Puerto Aéreo', line: '1', lat: 19.4775, lng: -99.0250 },
      { name: 'Gómez Farías', line: '1', lat: 19.4825, lng: -99.0125 },
      { name: 'Zaragoza', line: '1', lat: 19.4875, lng: -99.0000 },
      { name: 'Pantitlán', line: '1', lat: 19.4925, lng: -98.9875 },
      
      // Línea 2
      { name: 'Cuatro Caminos', line: '2', lat: 19.4975, lng: -99.2008 },
      { name: 'Panteones', line: '2', lat: 19.5025, lng: -99.1875 },
      { name: 'Tacuba', line: '2', lat: 19.5075, lng: -99.1750 },
      { name: 'Cuitláhuac', line: '2', lat: 19.5125, lng: -99.1625 },
      { name: 'Popotla', line: '2', lat: 19.5175, lng: -99.1500 },
      { name: 'Colegio Militar', line: '2', lat: 19.5225, lng: -99.1375 },
      { name: 'Normal', line: '2', lat: 19.5275, lng: -99.1250 },
      { name: 'San Cosme', line: '2', lat: 19.5325, lng: -99.1125 },
      { name: 'Revolución', line: '2', lat: 19.5375, lng: -99.1000 },
      { name: 'Hidalgo', line: '2', lat: 19.5425, lng: -99.0875 },
      { name: 'Bellas Artes', line: '2', lat: 19.5475, lng: -99.0750 },
      { name: 'Allende', line: '2', lat: 19.5525, lng: -99.0625 },
      { name: 'Zócalo', line: '2', lat: 19.5575, lng: -99.0500 },
      { name: 'Pino Suárez', line: '2', lat: 19.4475, lng: -99.1000 },
      { name: 'San Antonio Abad', line: '2', lat: 19.5625, lng: -99.0375 },
      { name: 'Chabacano', line: '2', lat: 19.5675, lng: -99.0250 },
      { name: 'Viaducto', line: '2', lat: 19.5725, lng: -99.0125 },
      { name: 'Xola', line: '2', lat: 19.5775, lng: -99.0000 },
      { name: 'Villa de Cortés', line: '2', lat: 19.5825, lng: -98.9875 },
      { name: 'Nativitas', line: '2', lat: 19.5875, lng: -98.9750 },
      { name: 'Portales', line: '2', lat: 19.5925, lng: -98.9625 },
      { name: 'Ermita', line: '2', lat: 19.5975, lng: -98.9500 },
      { name: 'General Anaya', line: '2', lat: 19.6025, lng: -98.9375 },
      { name: 'Tasqueña', line: '2', lat: 19.6075, lng: -98.9250 }
    ];

    const insertStation = db.prepare('INSERT OR IGNORE INTO metro_stations (name, line, latitude, longitude) VALUES (?, ?, ?, ?)');
    stations.forEach(station => {
      insertStation.run(station.name, station.line, station.lat, station.lng);
    });
    insertStation.finalize();
  });
}

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Verificar si las credenciales de Google Calendar están configuradas
const googleCalendarConfigured = process.env.GOOGLE_CLIENT_ID && 
                                process.env.GOOGLE_CLIENT_SECRET && 
                                process.env.GOOGLE_REFRESH_TOKEN;

if (googleCalendarConfigured) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  console.log('✅ Google Calendar configurado correctamente');
  console.log('📅 Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Faltante');
  console.log('🔑 Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'Faltante');
  console.log('🔄 Refresh Token:', process.env.GOOGLE_REFRESH_TOKEN ? 'Configurado' : 'Faltante');
} else {
  console.log('⚠️ Google Calendar no configurado - las reservas se guardarán solo en la base de datos');
  console.log('📅 Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Faltante');
  console.log('🔑 Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'Faltante');
  console.log('🔄 Refresh Token:', process.env.GOOGLE_REFRESH_TOKEN ? 'Configurado' : 'Faltante');
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Productos por categorías
const PRODUCTS_BY_CATEGORY = {
  'PERFUMES': [
    'New Code Red', 'Devos Magnetic', 'Bleu Intense', 'Nitro Intense', 'Devos Sport',
    'Magnat (Hombre)', 'L\'BEL i.d', 'Vanilla For Men', 'Forze Unlimited', 'Kromo Black Courant',
    'Live Adventure', 'Homme 033', 'Atheus', 'Element D\'Orsay Inspire', 'New Code (clásico)',
    'Nitro Cryzone', 'Desafiant', 'Le Tempo', 'Nitro Air Element', 'Live Intense',
    'Fogos', 'Devos Magnetic Seduction', 'Leyenda Christian Meier', 'Fist (Cyzone)',
    'Break In', 'Motion', 'D\'antan', 'H for Men Cardigan', 'Evolution', 'Energique',
    'Extreme Intense', 'Score (Cyzone)', 'Fist Team', 'You', 'Seduttore', 'Victorius 1200 C',
    'Kalos Prive Homme', 'Impredecible', 'Mityka Zaffyr', 'Chic MIA', 'Magnat (Mujer)',
    'Dream Mer', 'Valentia', 'Exotic', 'Ainnara Bleu & Blue', 'Rêve Sensuelle',
    'Tradition Du Thé Sensual', 'Tiare My Moment', 'Passion Concert Noir de Nuit',
    'Autenti-X Liasson Temps', 'Femme L\'Bel', 'Flirty Girl', 'Momentos Libertad MoonMyse',
    'Passion Musk', 'Sweet Black Exclusive', 'Grazzia Brises de Vie', 'Viva Vive Mon L\'Bel',
    'Liberté In Me (Cyzone)', 'Soleil Rosé Sweet Black', 'Pure Bloom', 'Emouv Mithyka',
    'Sweet Chick', 'L\'éclat L\'Bel', 'Danzzia', 'Liasson', 'Satin Rouge', 'Satin Nude',
    'Dancing Sunset', 'Passion Body & Spirit'
  ],
  'BODY MIST': [
    'Berrylicious', 'Taste Coco', 'Pink Pomelo', 'Select Mist', 'Taste Warm', 'Paradisso'
  ],
  'BOLSAS': [
    'Bolso Bandolera Beige', 'Bolsa Café', 'Mochila Beige', 'Caja para Maquillaje'
  ],
  'COMPLEMENTOS': [
    'Essential Limpiadora Suave', 'Essential Desmaquillador Bifásico', 'Espuma de Limpieza Facial',
    'Elixir De Luxe (tratamiento capilar)', 'Tratamiento Multibeneficios para Cabello'
  ]
};

// Route optimization using Google Maps API
async function getTransitTime(origin, destination) {
  // Si no hay API key de Google Maps, devolver valores simulados
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.log('Google Maps API key no configurada, usando valores simulados');
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km'
    };
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        mode: 'transit',
        transit_mode: 'subway',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      return {
        duration: leg.duration.value, // seconds
        durationText: leg.duration.text,
        distance: leg.distance.value, // meters
        distanceText: leg.distance.text
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting transit time:', error);
    // En caso de error, devolver valores simulados
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km'
    };
  }
}

// API Routes

// Get all metro stations
app.get('/api/stations', (req, res) => {
  db.all('SELECT * FROM metro_stations ORDER BY line, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get product categories
app.get('/api/categories', (req, res) => {
  res.json(Object.keys(PRODUCTS_BY_CATEGORY));
});

// Get products by category
app.get('/api/products/:category', (req, res) => {
  const { category } = req.params;
  const products = PRODUCTS_BY_CATEGORY[category];
  
  if (!products) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }
  
  res.json(products);
});

// Get available time slots for a date
app.get('/api/available-slots/:date', (req, res) => {
  const { date } = req.params;
  
  // Generate time slots from 10 AM to 6 PM (18:00)
  const slots = [];
  for (let hour = 10; hour <= 17; hour++) { // Cambiar a <= 17 para incluir hasta 17:30
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }

  // Check existing bookings for this date
  db.all('SELECT delivery_time FROM bookings WHERE delivery_date = ?', [date], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const bookedTimes = rows.map(row => row.delivery_time);
    const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
    
    res.json(availableSlots);
  });
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  const {
    customer_name,
    customer_phone,
    products,
    metro_station,
    delivery_date,
    delivery_time
  } = req.body;

  try {
    // Validate minimum 1 day advance booking
    const deliveryDateTime = moment(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm');
    const tomorrow = moment().add(1, 'day').startOf('day');
    const now = moment();
    
    if (deliveryDateTime.isBefore(tomorrow)) {
      return res.status(400).json({
        error: 'Solo se pueden hacer reservas con al menos 1 día de anticipación.'
      });
    }

    // Validate that the time is in the future (not today or past)
    if (deliveryDateTime.isBefore(now)) {
      return res.status(400).json({
        error: 'No se pueden hacer reservas en horas que ya pasaron.'
      });
    }

    // Validate minimum time between bookings (20 minutes)
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time FROM bookings WHERE delivery_date = ?', [delivery_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const requestedTime = moment(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm');
    
    for (const booking of existingBookings) {
      const bookingTime = moment(`${delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm');
      const timeDiff = Math.abs(requestedTime.diff(bookingTime, 'minutes'));
      
      if (timeDiff < 20) {
        return res.status(400).json({
          error: 'Debe haber al menos 20 minutos entre entregas. Horario no disponible.'
        });
      }
    }

    // Insert booking into database
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookings (customer_name, customer_phone, products, metro_station, delivery_date, delivery_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_name, customer_phone, products, metro_station, delivery_date, delivery_time, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Create Google Calendar event
    if (googleCalendarConfigured) {
      try {
        console.log('📅 Intentando crear evento en Google Calendar...');
        const event = {
          summary: `[POR CONFIRMAR] Entrega: ${products} - ${metro_station}`,
          description: `Cliente: ${customer_name}\nTeléfono: ${customer_phone}\nProductos: ${products}\nEstación: ${metro_station}\nEstado: Por confirmar`,
          start: {
            dateTime: moment(`${delivery_date} ${delivery_time}`).format(),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: moment(`${delivery_date} ${delivery_time}`).add(30, 'minutes').format(),
            timeZone: 'America/Mexico_City',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        const calendarResponse = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });

        console.log('✅ Evento creado en Google Calendar:', calendarResponse.data.id);

        // Update booking with Google Calendar event ID
        db.run('UPDATE bookings SET google_calendar_event_id = ? WHERE id = ?', 
          [calendarResponse.data.id, result]);

        res.json({
          success: true,
          booking_id: result,
          calendar_event_id: calendarResponse.data.id,
          message: 'Reserva creada exitosamente y agregada al calendario'
        });

      } catch (calendarError) {
        console.error('❌ Error creating calendar event:', calendarError.message);
        console.error('📋 Error details:', calendarError.response?.data || calendarError);
        res.json({
          success: true,
          booking_id: result,
          message: 'Reserva creada exitosamente (error al crear evento en calendario)'
        });
      }
    } else {
      // Si Google Calendar no está configurado, solo guardar en base de datos
      console.log('⚠️ Google Calendar no configurado, guardando solo en base de datos');
      res.json({
        success: true,
        booking_id: result,
        message: 'Reserva creada exitosamente (Google Calendar no configurado)'
      });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const sentPassword = req.headers['x-admin-password'] || req.body.admin_password;
  if (sentPassword !== adminPassword) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// Get all bookings
app.get('/api/bookings', adminAuth, (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY delivery_date DESC, delivery_time DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get route optimization between two stations
app.get('/api/route/:origin/:destination', async (req, res) => {
  const { origin, destination } = req.params;
  
  try {
    const transitInfo = await getTransitTime(origin, destination);
    
    if (transitInfo) {
      res.json({
        origin,
        destination,
        transitTime: transitInfo
      });
    } else {
      res.status(404).json({ error: 'No se pudo calcular la ruta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular la ruta' });
  }
});

// Confirm a booking
app.post('/api/bookings/:id/confirm', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Update status in database
    await new Promise((resolve, reject) => {
      db.run('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update Google Calendar event if it exists
    if (booking.google_calendar_event_id && googleCalendarConfigured) {
      try {
        const event = {
          summary: `[CONFIRMADA] Entrega: ${booking.products} - ${booking.metro_station}`,
          description: `Cliente: ${booking.customer_name}\nTeléfono: ${booking.customer_phone}\nProductos: ${booking.products}\nEstación: ${booking.metro_station}\nEstado: Confirmada`,
          start: {
            dateTime: moment(`${booking.delivery_date} ${booking.delivery_time}`).format(),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: moment(`${booking.delivery_date} ${booking.delivery_time}`).add(30, 'minutes').format(),
            timeZone: 'America/Mexico_City',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        await calendar.events.update({
          calendarId: 'primary',
          eventId: booking.google_calendar_event_id,
          resource: event,
        });

      } catch (calendarError) {
        console.error('Error updating calendar event:', calendarError);
        // Continue even if calendar update fails
      }
    }

    res.json({
      success: true,
      message: 'Reserva confirmada exitosamente'
    });

  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Error al confirmar la reserva' });
  }
});

// Serve React app
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 